const bcrypt = require('bcryptjs');
const crypto = require('crypto');

async function generate() {
  const email = 'curtis@printfrenzy.dev';
  const pass = 'admin123';
  const hash = await bcrypt.hash(pass, 10);
  const id = crypto.randomUUID();
  
  console.log(`Email: ${email}`);
  console.log(`Password: ${pass}`);
  console.log(`Hash: ${hash}`);
  console.log(`ID: ${id}`);
  
  console.log('\n--- POWERSHELL COMMAND ---');
  console.log(`npx wrangler d1 execute DB --local --command="INSERT INTO users (id, email, password_hash, role) VALUES ('${id}', '${email}', '${hash}', 'ADMIN');"`);
  
  console.log('\n--- REMOTE COMMAND (USE SINGLE QUOTES FOR HASH) ---');
  console.log(`npx wrangler d1 execute DB --remote --command="INSERT INTO users (id, email, password_hash, role) VALUES ('${id}', '${email}', '${hash}', 'ADMIN');"`);
}

generate();
