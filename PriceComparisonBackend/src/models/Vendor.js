import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema(
  {
    vendorId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    /** @deprecated Serial pattern matching is no longer used. Vendor is selected explicitly on upload. */
    serialPatterns: {
      type: [String],
      default: [],
    },
    contactInfo: {
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
      address: { type: String, default: '' },
    },
  },
  {
    timestamps: true,
  }
);

const Vendor = mongoose.model('Vendor', vendorSchema);
export default Vendor;
