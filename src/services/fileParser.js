import { readFile } from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import logger from '../utils/logger.js';

/**
 * Parse an invoice file and return a normalized structure.
 * Supports: .csv, .xls, .xlsx
 *
 * @param {string} filePath - Path to the invoice file
 * @returns {Promise<{
 *   serialNumber: string,
 *   orderDate: Date|null,
 *   customerName: string,
 *   companyName: string,
 *   items: Array<{ sku: string, productName: string, unitPrice: number, soldPrice: number, quantity: number, lineTotal: number, tax: number }>
 * }>}
 */
export async function parseInvoiceFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.csv') {
    return parseCSV(filePath);
  } else if (ext === '.xls' || ext === '.xlsx') {
    return parseExcel(filePath);
  } else {
    throw new Error(`Unsupported file format: ${ext} (file: ${path.basename(filePath)})`);
  }
}

// ─── CSV Parsing ─────────────────────────────────────────────────────

/**
 * Detect CSV format from header row and parse accordingly.
 * Format A (simple):  Order #,,UPC,Product Name,Unit Price,Sold Price,Quantity,Total[,,Markup,,Total]
 * Format B (extended): "Order #","Order Date","Customer Name","Company Name","UPC","Single Upc","Product Name","Unit Price","Sold Price","Tax","Quantity","Sales Order Quantity","Box Quantity","Total"
 */
async function parseCSV(filePath) {
  const raw = await readFile(filePath, 'utf-8');

  const records = parse(raw, {
    columns: false,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  });

  if (records.length < 2) {
    throw new Error(`CSV file has no data rows: ${path.basename(filePath)}`);
  }

  const header = records[0];
  const normalizedHeader = header.map((h) => h.replace(/"/g, '').trim().toLowerCase());

  // Detect format by checking for 'order date' column
  const isExtended = normalizedHeader.includes('order date');

  if (isExtended) {
    return parseExtendedCSV(records, normalizedHeader);
  } else {
    return parseSimpleCSV(records, normalizedHeader);
  }
}

/**
 * Parse Format A: Simple CSV
 * Columns: Order #, (empty), UPC, Product Name, Unit Price, Sold Price, Quantity, Total, ...
 */
function parseSimpleCSV(records, header) {
  // Build column index map
  const colMap = buildColumnMap(header);

  const orderCol = colMap['order #'] ?? 0;
  const upcCol = colMap['upc'] ?? 2;
  const productCol = colMap['product name'] ?? 3;
  const unitPriceCol = colMap['unit price'] ?? 4;
  const soldPriceCol = colMap['sold price'] ?? 5;
  const quantityCol = colMap['quantity'] ?? 6;
  const totalCol = colMap['total'] ?? 7;

  let serialNumber = '';
  const items = [];

  for (let i = 1; i < records.length; i++) {
    const row = records[i];
    if (!row || row.every((cell) => !cell || cell.trim() === '')) continue;

    const serial = cleanValue(row[orderCol]);
    if (serial && !serialNumber) {
      serialNumber = serial;
    }

    const sku = cleanValue(row[upcCol]);
    const productName = cleanValue(row[productCol]);
    if (!sku && !productName) continue;

    items.push({
      sku: sku || '',
      productName: productName || '',
      unitPrice: parseNum(row[unitPriceCol]),
      soldPrice: parseNum(row[soldPriceCol]),
      quantity: parseNum(row[quantityCol]),
      lineTotal: parseNum(row[totalCol]),
      tax: 0,
    });
  }

  return {
    serialNumber,
    orderDate: null,
    customerName: '',
    companyName: '',
    items,
  };
}

/**
 * Parse Format B: Extended CSV
 * Columns: Order #, Order Date, Customer Name, Company Name, UPC, Single Upc, Product Name, Unit Price, Sold Price, Tax, Quantity, Sales Order Quantity, Box Quantity, Total
 */
function parseExtendedCSV(records, header) {
  const colMap = buildColumnMap(header);

  const orderCol = colMap['order #'] ?? 0;
  const dateCol = colMap['order date'] ?? 1;
  const customerCol = colMap['customer name'] ?? 2;
  const companyCol = colMap['company name'] ?? 3;
  const upcCol = colMap['upc'] ?? 4;
  const productCol = colMap['product name'] ?? 6;
  const unitPriceCol = colMap['unit price'] ?? 7;
  const soldPriceCol = colMap['sold price'] ?? 8;
  const taxCol = colMap['tax'] ?? 9;
  const quantityCol = colMap['quantity'] ?? 10;
  const totalCol = colMap['total'] ?? 13;

  let serialNumber = '';
  let orderDate = null;
  let customerName = '';
  let companyName = '';
  const items = [];

  for (let i = 1; i < records.length; i++) {
    const row = records[i];
    if (!row || row.every((cell) => !cell || cell.trim() === '')) continue;

    const serial = cleanValue(row[orderCol]);
    if (serial && !serialNumber) {
      serialNumber = serial;
    }

    if (!orderDate && row[dateCol]) {
      const parsed = new Date(cleanValue(row[dateCol]));
      if (!isNaN(parsed.getTime())) {
        orderDate = parsed;
      }
    }

    if (!customerName && row[customerCol]) {
      customerName = cleanValue(row[customerCol]);
    }
    if (!companyName && row[companyCol]) {
      companyName = cleanValue(row[companyCol]);
    }

    const sku = cleanValue(row[upcCol]);
    const productName = cleanValue(row[productCol]);
    if (!sku && !productName) continue;

    items.push({
      sku: sku || '',
      productName: productName || '',
      unitPrice: parseNum(row[unitPriceCol]),
      soldPrice: parseNum(row[soldPriceCol]),
      quantity: parseNum(row[quantityCol]),
      lineTotal: parseNum(row[totalCol]),
      tax: parseNum(row[taxCol]),
    });
  }

  return {
    serialNumber,
    orderDate,
    customerName,
    companyName,
    items,
  };
}

// ─── Excel Parsing ───────────────────────────────────────────────────

/**
 * Parse .xls / .xlsx files using the xlsx library.
 * Dynamically detects column headers and maps to normalized fields.
 */
async function parseExcel(filePath) {
  const buffer = await readFile(filePath);
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error(`Excel file has no sheets: ${path.basename(filePath)}`);
  }

  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (jsonData.length === 0) {
    throw new Error(`Excel file has no data rows: ${path.basename(filePath)}`);
  }

  // Normalize column names from the first row's keys
  const rawColumns = Object.keys(jsonData[0]);
  const columnMapping = mapExcelColumns(rawColumns);

  logger.debug(`Excel columns for ${path.basename(filePath)}:`, rawColumns);

  let serialNumber = '';
  let orderDate = null;
  let customerName = '';
  let companyName = '';
  const items = [];

  for (const row of jsonData) {
    const serial = String(getField(row, columnMapping.orderId) || '').trim();
    if (serial && !serialNumber) {
      serialNumber = serial;
    }

    if (!orderDate && columnMapping.orderDate) {
      const dateVal = getField(row, columnMapping.orderDate);
      if (dateVal) {
        const parsed = dateVal instanceof Date ? dateVal : new Date(dateVal);
        if (!isNaN(parsed.getTime())) {
          orderDate = parsed;
        }
      }
    }

    if (!customerName && columnMapping.customerName) {
      customerName = String(getField(row, columnMapping.customerName) || '').trim();
    }
    if (!companyName && columnMapping.companyName) {
      companyName = String(getField(row, columnMapping.companyName) || '').trim();
    }

    const sku = String(getField(row, columnMapping.upc) || '').trim();
    const productName = String(getField(row, columnMapping.productName) || '').trim();
    if (!sku && !productName) continue;

    items.push({
      sku,
      productName,
      unitPrice: parseNum(getField(row, columnMapping.unitPrice)),
      soldPrice: parseNum(getField(row, columnMapping.soldPrice)),
      quantity: parseNum(getField(row, columnMapping.quantity)),
      lineTotal: parseNum(getField(row, columnMapping.total)),
      tax: parseNum(getField(row, columnMapping.tax)),
    });
  }

  return {
    serialNumber,
    orderDate,
    customerName,
    companyName,
    items,
  };
}

/**
 * Map raw Excel column names to our normalized field names.
 * Uses fuzzy matching to handle various naming conventions.
 */
function mapExcelColumns(rawColumns) {
  const lower = rawColumns.map((c) => c.toLowerCase().trim());

  return {
    orderId: findColumn(rawColumns, lower, ['order #', 'order no', 'order id', 'orderid', 'order number', 'invoice #', 'invoice no']),
    orderDate: findColumn(rawColumns, lower, ['order date', 'date', 'invoice date']),
    customerName: findColumn(rawColumns, lower, ['customer name', 'customer', 'client name']),
    companyName: findColumn(rawColumns, lower, ['company name', 'company']),
    upc: findColumn(rawColumns, lower, ['upc', 'sku', 'barcode', 'item code', 'product code']),
    productName: findColumn(rawColumns, lower, ['product name', 'product', 'item name', 'description', 'item description']),
    unitPrice: findColumn(rawColumns, lower, ['unit price', 'price', 'cost', 'unit cost']),
    soldPrice: findColumn(rawColumns, lower, ['sold price', 'sell price', 'sale price', 'selling price']),
    quantity: findColumn(rawColumns, lower, ['quantity', 'qty', 'count']),
    total: findColumn(rawColumns, lower, ['total', 'line total', 'amount', 'extended price', 'ext price']),
    tax: findColumn(rawColumns, lower, ['tax', 'tax amount', 'vat']),
  };
}

/**
 * Find the original column name from the raw columns that matches
 * one of the provided search terms.
 */
function findColumn(rawColumns, lowerColumns, searchTerms) {
  for (const term of searchTerms) {
    const idx = lowerColumns.indexOf(term);
    if (idx !== -1) return rawColumns[idx];
  }
  // Partial match fallback
  for (const term of searchTerms) {
    const idx = lowerColumns.findIndex((c) => c.includes(term));
    if (idx !== -1) return rawColumns[idx];
  }
  return null;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function buildColumnMap(headerRow) {
  const map = {};
  for (let i = 0; i < headerRow.length; i++) {
    const key = headerRow[i].replace(/"/g, '').trim().toLowerCase();
    if (key && !(key in map)) {
      map[key] = i;
    }
  }
  return map;
}

function getField(row, columnName) {
  if (!columnName) return '';
  return row[columnName] ?? '';
}

function cleanValue(val) {
  if (val == null) return '';
  return String(val).replace(/"/g, '').trim();
}

function parseNum(val) {
  if (val == null || val === '') return 0;
  const num = parseFloat(String(val).replace(/[^0-9.\-]/g, ''));
  return isNaN(num) ? 0 : num;
}

export default parseInvoiceFile;
