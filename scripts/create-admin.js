const crypto = require('crypto');

/**
 * PBKDF2 Hashing (Node.js compatible version for scripts)
 */
function hashPassword(password) {
  const iterations = 100000;
  const salt = crypto.randomBytes(16);
  const keyLen = 32; 
  
  const hash = crypto.pbkdf2Sync(password, salt, iterations, keyLen, 'sha256');
  const saltHex = salt.toString('hex');
  const hashHex = hash.toString('hex');
  
  return `${iterations}.${saltHex}.${hashHex}`;
}

async function generate() {
  const email = 'curtis@printfrenzy.dev';
  const pass = 'admin123';
  const hash = hashPassword(pass);
  const id = crypto.randomUUID();
  
  console.log(`Email: ${email}`);
  console.log(`Password: ${pass}`);
  
  console.log('\n--- POWERSHELL COMMAND (LOCAL) ---');
  console.log(`npx wrangler d1 execute printfrenzy_db --local --command="INSERT OR REPLACE INTO users (id, email, password_hash, role) VALUES ('${id}', '${email}', '${hash}', 'ADMIN');"`);
  
  console.log('\n--- REMOTE COMMAND (PRODUCTION) ---');
  console.log(`npx wrangler d1 execute printfrenzy_db --remote --command="INSERT OR REPLACE INTO users (id, email, password_hash, role) VALUES ('${id}', '${email}', '${hash}', 'ADMIN');"`);
}

generate();
