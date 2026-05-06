# shellcheck shell=bash
# totp.sh — RFC 6238 TOTP code generation for the smoke harness.
#
# Usage:
#   source lib/totp.sh
#   totp_for_secret JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP   # echoes 6-digit code
#
# Implementation: pure Node (already a smoke-suite dep — see run-all.sh:18-21).
# Uses Node's built-in crypto.createHmac. No npm packages, no oathtool.

totp_for_secret() {
  local secret="$1"
  if [[ -z "$secret" ]]; then
    echo ""
    return 1
  fi
  node -e '
    const crypto = require("crypto");
    const b32 = String(process.argv[1]).replace(/=+$/, "").toUpperCase();
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let bits = "";
    for (const c of b32) {
      const v = alphabet.indexOf(c);
      if (v < 0) { process.stderr.write("bad base32 char: " + c); process.exit(2); }
      bits += v.toString(2).padStart(5, "0");
    }
    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
      bytes.push(parseInt(bits.substr(i, 8), 2));
    }
    const key = Buffer.from(bytes);
    const counter = Math.floor(Date.now() / 1000 / 30);
    const ctr = Buffer.alloc(8);
    ctr.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
    ctr.writeUInt32BE(counter >>> 0, 4);
    const hmac = crypto.createHmac("sha1", key).update(ctr).digest();
    const offset = hmac[19] & 0x0f;
    const binary = ((hmac[offset] & 0x7f) << 24) |
                   ((hmac[offset + 1] & 0xff) << 16) |
                   ((hmac[offset + 2] & 0xff) << 8) |
                    (hmac[offset + 3] & 0xff);
    const code = (binary % 1000000).toString().padStart(6, "0");
    process.stdout.write(code);
  ' "$secret"
}
