/**
 * Vendor identification rules.
 *
 * Each rule defines a vendor key, display name, and a match function
 * that tests whether a given serial number belongs to that vendor.
 *
 * To add a new vendor, simply append a new entry to this array.
 * The first matching rule wins, so order matters for overlapping prefixes.
 */
export const VENDOR_RULES = [
  {
    vendorKey: 'vendor_b',
    name: 'Vendor B',
    description: 'Serial numbers starting with 8, 9, or 10',
    serialPatterns: ['^8', '^9', '^10'],
    match: (serial) => /^(8|9|10)/.test(String(serial)),
  },
  {
    vendorKey: 'vendor_c',
    name: 'Vendor C',
    description: 'Serial numbers starting with 3',
    serialPatterns: ['^3'],
    match: (serial) => String(serial).startsWith('3'),
  },
  {
    vendorKey: 'vendor_d',
    name: 'Vendor D',
    description: 'Serial numbers starting with 4',
    serialPatterns: ['^4'],
    match: (serial) => String(serial).startsWith('4'),
  },
  {
    vendorKey: 'vendor_a',
    name: 'Vendor A',
    description: 'Serial numbers starting with 5',
    serialPatterns: ['^5'],
    match: (serial) => String(serial).startsWith('5'),
  },
  {
    vendorKey: 'vendor_e',
    name: 'Vendor E',
    description: 'Serial numbers starting with 6',
    serialPatterns: ['^6'],
    match: (serial) => String(serial).startsWith('6'),
  },
];

export default VENDOR_RULES;
