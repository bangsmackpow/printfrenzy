import crypto from 'crypto';

/**
 * PBKDF2 Hashing (Node.js compatible version for scripts)
 * MATCHES src/utils/hashUtils.ts (600,000 iterations)
 */
function hashPassword(password) {
  const iterations = 600000;
  const salt = crypto.randomBytes(16);
  const keyLen = 32; 
  
  const hash = crypto.pbkdf2Sync(password, salt, iterations, keyLen, 'sha256');
  const saltHex = salt.toString('hex');
  const hashHex = hash.toString('hex');
  
  return `${iterations}.${saltHex}.${hashHex}`;
}

async function generateAdmin() {
    const email = process.argv[2] || 'admin@printfrenzy.dev';
    const password = process.argv[3] || 'changeme123';
    const id = crypto.randomUUID();
    const hash = hashPassword(password);

    console.log('\n--- FIRST ADMIN SETUP ---');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log('--------------------------\n');
    console.log('Run this command to create your first admin user in D1:\n');
    console.log(`npx wrangler d1 execute DB --remote --command="INSERT INTO users (id, email, password_hash, role) VALUES ('${id}', '${email}', '${hash}', 'ADMIN');"`);
    console.log('\n(Note: Replace "DB" with your actual database name/binding from wrangler.toml if it differs)\n');
}

generateAdmin().catch(console.error);
