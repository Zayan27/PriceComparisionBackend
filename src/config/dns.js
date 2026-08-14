import dns from 'dns';

/**
 * Configure Node.js DNS resolver to use public DNS servers.
 *
 * Uses IPv6 addresses first (Google & Cloudflare) for environments
 * where IPv4 DNS is unreachable, with IPv4 fallbacks for other setups.
 */
export function configureGoogleDNS() {
  // Force IPv4-first resolution — MongoDB Atlas only supports IPv4 whitelisting
  dns.setDefaultResultOrder('ipv4first');
  dns.setServers([
    '2001:4860:4860::8888', // Google IPv6
    '2001:4860:4860::8844', // Google IPv6 secondary
    '2606:4700:4700::1111', // Cloudflare IPv6
    '8.8.8.8',
    '8.8.4.4',            // Google IPv4 fallback
    '1.1.1.1',              // Cloudflare IPv4 fallback
  ]);
}

export default configureGoogleDNS;
