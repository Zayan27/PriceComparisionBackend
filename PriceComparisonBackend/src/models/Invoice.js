import mongoose from 'mongoose';

const invoiceItemSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    soldPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    serialNumber: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    vendorId: {
      type: String,
      ref: 'Vendor',
      required: true,
      index: true,
    },
    rawFileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileMetadata: {
      createdAt: { type: Date },
      modifiedAt: { type: Date },
      size: { type: Number },
    },
    invoiceDate: {
      type: Date,
      default: null,
    },
    customerName: {
      type: String,
      default: '',
      trim: true,
    },
    companyName: {
      type: String,
      default: '',
      trim: true,
    },
    items: {
      type: [invoiceItemSchema],
      default: [],
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    totalTax: {
      type: Number,
      default: 0,
    },
    ingestedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index for idempotent ingestion:
// same serial + same file = same invoice, don't duplicate
invoiceSchema.index({ serialNumber: 1, rawFileName: 1 }, { unique: true });

const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;
