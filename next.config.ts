import type { NextConfig } from "next";

/* ═══════════════════════════════════════════════════════════════════
   NEXT.JS CONFIGURATION
   - Security Headers (CSP, HSTS, etc.)
   - Allowed Origins for Dev Local Network
   ═══════════════════════════════════════════════════════════════════ */

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(self), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // 'unsafe-eval' is REQUIRED for Next.js/Turbopack in development mode
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' /sw-register.js",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      // Added ws: and wss: for Hot Module Replacement (HMR)
      "connect-src 'self' ws: wss: https://*.googleapis.com https://*.supabase.co https://generativelanguage.googleapis.com",
      "frame-ancestors 'none'",
    ].join('; '),
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow local network access for testing on mobile/other devices
  allowedDevOrigins: ['localhost:3000', '192.168.100.111:3000', '192.168.100.111'],
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
