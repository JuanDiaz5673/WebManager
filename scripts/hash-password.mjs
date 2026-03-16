#!/usr/bin/env node

// Usage: node scripts/hash-password.mjs <your-password>
// Outputs the SHA-256 hash in base64url format for ADMIN_PASSWORD_HASH

const password = process.argv[2];
if (!password) {
  console.error("Usage: node scripts/hash-password.mjs <password>");
  process.exit(1);
}

const encoder = new TextEncoder();
const hash = await crypto.subtle.digest("SHA-256", encoder.encode(password));
const bytes = new Uint8Array(hash);
let str = "";
for (const b of bytes) str += String.fromCharCode(b);
const base64url = btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

console.log(`\nPassword hash for ADMIN_PASSWORD_HASH:\n${base64url}\n`);
