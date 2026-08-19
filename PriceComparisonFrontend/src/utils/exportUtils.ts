import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { PriceComparisonItem } from '../api/comparisonApi';

/** The 4 configured vendors in display order */
const VENDOR_COLUMNS = [
  { key: 'ss_distro', name: 'SS Distro' },
  { key: 'flw_tx', name: 'FLW TX' },
  { key: 'rave', name: 'RAVE' },
  { key: 'touchtell', name: 'TouchTell' },
];

/**
 * Helper: look up a vendor's latest unit price from a product's vendorBreakdown.
 * Returns the price as a number or null if the vendor hasn't supplied this SKU.
 */
function getVendorPrice(item: PriceComparisonItem, vendorKey: string): number | null {
  const entry = item.vendorBreakdown?.find(
    (v) => v.vendorId === vendorKey
  );
  return entry ? (entry.latestUnitPrice ?? entry.latestPrice ?? null) : null;
}

// ──────────────────────────────────────────────────────────────────────
// Excel Export
// ──────────────────────────────────────────────────────────────────────

/**
 * Export the current price comparison matrix to a .xlsx file.
 *
 * @param data - Array of PriceComparisonItem from the API
 * @param filename - Download filename (without extension)
 */
export function exportToExcel(data: PriceComparisonItem[], filename = 'price_comparison') {
  // Build rows
  const rows = data.map((item) => {
    const row: Record<string, string | number> = {
      SKU: item.sku,
      'Product Name': item.productName || 'Unknown',
    };

    // Vendor price columns
    for (const vc of VENDOR_COLUMNS) {
      const price = getVendorPrice(item, vc.key);
      row[vc.name] = price != null ? price : '-';
    }

    // Analytics columns
    row['Min Price'] = item.priceSummary?.lowest ?? '-';
    row['Max Price'] = item.priceSummary?.highest ?? '-';
    row['Avg Price'] = item.priceSummary?.average ?? '-';
    row['Vendor Count'] = item.vendorCount ?? 0;

    return row;
  });

  // Create worksheet and workbook
  const ws = XLSX.utils.json_to_sheet(rows);

  // Auto-size columns
  const colWidths = Object.keys(rows[0] || {}).map((key) => ({
    wch: Math.max(key.length + 2, 14),
  }));
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Price Comparison');

  // Trigger download
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ──────────────────────────────────────────────────────────────────────
// PDF Export
// ──────────────────────────────────────────────────────────────────────

/**
 * Export a single product's detailed comparison view to a PDF.
 *
 * @param item - The PriceComparisonItem to export
 * @param filename - Download filename (without extension)
 */
export function exportToPDF(item: PriceComparisonItem, filename?: string) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // ─── Header ──────────────────────────────────────────────────
  doc.setFillColor(24, 144, 255);
  doc.rect(0, 0, pageWidth, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Price Comparison Report', margin, 20);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, 20, { align: 'right' });

  // ─── Product Details ──────────────────────────────────────────
  let y = 44;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(item.productName || 'Unknown Product', margin, y);
  y += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`SKU: ${item.sku}`, margin, y);
  y += 5;
  doc.text(`Vendors Quoting: ${item.vendorCount || 0}`, margin, y);

  // ─── Price Summary Box ───────────────────────────────────────
  y += 12;
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 24, 3, 3, 'F');

  const boxY = y + 8;
  const colW = (pageWidth - margin * 2) / 3;

  // Lowest
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Lowest Price', margin + colW * 0 + 4, boxY);
  doc.setFontSize(16);
  doc.setTextColor(82, 196, 26);
  doc.setFont('helvetica', 'bold');
  doc.text(`$${(item.priceSummary?.lowest ?? 0).toFixed(2)}`, margin + colW * 0 + 4, boxY + 10);

  // Highest
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('Highest Price', margin + colW * 1 + 4, boxY);
  doc.setFontSize(16);
  doc.setTextColor(207, 19, 34);
  doc.setFont('helvetica', 'bold');
  doc.text(`$${(item.priceSummary?.highest ?? 0).toFixed(2)}`, margin + colW * 1 + 4, boxY + 10);

  // Average
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('Average Price', margin + colW * 2 + 4, boxY);
  doc.setFontSize(16);
  doc.setTextColor(24, 144, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(`$${(item.priceSummary?.average ?? 0).toFixed(2)}`, margin + colW * 2 + 4, boxY + 10);

  // ─── Vendor Breakdown Table ──────────────────────────────────
  y += 34;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Vendor Breakdown', margin, y);
  y += 4;

  const sortedVendors = [...(item.vendorBreakdown || [])].sort(
    (a, b) => (a.latestPrice ?? a.latestUnitPrice ?? 0) - (b.latestPrice ?? b.latestUnitPrice ?? 0)
  );

  const tableBody = sortedVendors.map((v) => {
    const price = v.latestUnitPrice ?? v.latestPrice ?? 0;
    const isBest = price === item.priceSummary?.lowest;
    return [
      v.vendorName || v.vendorId,
      `$${price.toFixed(2)}`,
      isBest ? '★ Best' : '',
      v.invoiceCount?.toString() || '0',
      v.lastInvoiceDate ? new Date(v.lastInvoiceDate).toLocaleDateString() : 'N/A',
    ];
  });

  // Add rows for vendors with no data
  for (const vc of VENDOR_COLUMNS) {
    const found = sortedVendors.find((v) => v.vendorId === vc.key);
    if (!found) {
      tableBody.push([vc.name, '-', '', '0', 'N/A']);
    }
  }

  autoTable(doc, {
    startY: y,
    head: [['Vendor', 'Unit Price', 'Status', 'Invoices', 'Last Invoice']],
    body: tableBody,
    theme: 'striped',
    headStyles: { fillColor: [24, 144, 255], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 10 },
    margin: { left: margin, right: margin },
  });

  // ─── Footer ──────────────────────────────────────────────────
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Price Analytics — Confidential', margin, pageHeight - 8);
  doc.text(`Page 1 of 1`, pageWidth - margin, pageHeight - 8, { align: 'right' });

  // ─── Save ────────────────────────────────────────────────────
  const safeName = (item.productName || item.sku || 'product').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40);
  doc.save(`${filename || `comparison_${safeName}`}.pdf`);
}
