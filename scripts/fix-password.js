/**
 * Generate a PBKDF2 password hash compatible with PrintFrenzy's hashUtils.ts
 * Outputs the SQL command to update a user's password_hash in D1.
 * 
 * Usage: node scripts/fix-password.js <new-password>
 * Then run: wrangler d1 execute printfrenzy --remote --command "<SQL>"
 */

const crypto = require('crypto');

const ITERATIONS = 100000;
const SALT_LEN = 16;
const KEY_LEN = 32;

async function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_LEN);
  
  const derivedKey = crypto.pbkdf2Sync(
    password,
    salt,
    ITERATIONS,
    KEY_LEN,
    'sha256'
  );
  
  const saltHex = salt.toString('hex');
  const hashHex = derivedKey.toString('hex');
  
  return `${ITERATIONS}.${saltHex}.${hashHex}`;
}

async function main() {
  const password = process.argv[2];
  if (!password) {
    console.error('Usage: node scripts/fix-password.js <new-password>');
    console.error('Example: node scripts/fix-password.js "MyNewPass123!"');
    process.exit(1);
  }
  
  if (password.length < 8) {
    console.error('Error: Password must be at least 8 characters');
    process.exit(1);
  }
  
  const hash = await hashPassword(password);
  
  console.log('\n=== PBKDF2 Hash Generated ===');
  console.log(`Hash: ${hash}\n`);
  
  console.log('=== SQL Commands ===');
  console.log('To list all users and find the user ID:');
  console.log(`wrangler d1 execute printfrenzy --remote --command "SELECT id, email, role FROM users ORDER BY email;"\n`);
  
  console.log('To update a specific user (replace USER_ID and HASH):');
  console.log(`wrangler d1 execute printfrenzy --remote --command "UPDATE users SET password_hash = '${hash}' WHERE id = 'USER_ID';"\n`);
  
  console.log('Or to update by email:');
  console.log(`wrangler d1 execute printfrenzy --remote --command "UPDATE users SET password_hash = '${hash}' WHERE email = 'your@email.com';"\n`);
}

main().catch(console.error);
