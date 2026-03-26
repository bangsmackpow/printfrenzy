/**
 * Native Web Crypto Hashing (PBKDF2)
 * This replaces bcryptjs to keep the bundle size under 3MB on Cloudflare.
 */

const ITERATIONS = 100000;
const SALT_LEN = 16;
const KEY_LEN = 32;

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  
  const baseKey = await crypto.subtle.importKey(
    "raw",
    passwordData,
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    KEY_LEN * 8
  );

  const hashArray = new Uint8Array(derivedBits);
  
  // Format: iterations.salt(hex).hash(hex)
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `${ITERATIONS}.${saltHex}.${hashHex}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  // Fallback for old Bcrypt hashes if they don't contain our PBKDF2 separator '.'
  if (!storedHash.includes('.')) {
    console.warn("Detected legacy Bcrypt hash. Please reset password to upgrade to native hashing.");
    return false; // We are disabling bcrypt to save space. User must reset.
  }

  const [iterationsStr, saltHex, hashHex] = storedHash.split('.');
  const iterations = parseInt(iterationsStr, 10);
  
  const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);

  const baseKey = await crypto.subtle.importKey(
    "raw",
    passwordData,
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: iterations,
      hash: "SHA-256",
    },
    baseKey,
    KEY_LEN * 8
  );

  const hashArray = new Uint8Array(derivedBits);
  const newHashHex = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');
  
  return newHashHex === hashHex;
}
