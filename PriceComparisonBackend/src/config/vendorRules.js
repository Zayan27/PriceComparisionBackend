/**
 * Vendor configuration.
 *
 * Defines the 4 primary vendors pre-configured in the system.
 * Serial-range heuristics have been deprecated — vendor is now
 * explicitly selected during invoice upload.
 */
export const VENDOR_RULES = [
  {
    vendorKey: 'ss_distro',
    name: 'SS Distro',
    description: 'SS Distro vendor',
  },
  {
    vendorKey: 'flw_tx',
    name: 'FLW TX',
    description: 'FLW TX vendor',
  },
  {
    vendorKey: 'rave',
    name: 'RAVE',
    description: 'RAVE vendor',
  },
  {
    vendorKey: 'touchtell',
    name: 'TouchTell',
    description: 'TouchTell vendor',
  },
];

export default VENDOR_RULES;
