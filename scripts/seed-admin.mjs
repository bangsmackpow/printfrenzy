import bcrypt from 'bcryptjs';
import crypto from 'crypto';

async function generateAdmin() {
    const email = process.argv[2] || 'admin@printfrenzy.dev';
    const password = process.argv[3] || 'changeme123';
    const id = crypto.randomUUID();
    const hash = await bcrypt.hash(password, 10);

    console.log('\n--- FIRST ADMIN SETUP ---');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log('--------------------------\n');
    console.log('Run this command to create your first admin user in D1:\n');
    console.log(`npx wrangler d1 execute DB --remote --command="INSERT INTO users (id, email, password_hash, role) VALUES ('${id}', '${email}', '${hash}', 'ADMIN');"`);
    console.log('\n(Note: Replace "DB" with your actual database name/binding from wrangler.toml if it differs)\n');
}

generateAdmin().catch(console.error);
