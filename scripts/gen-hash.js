const bcrypt = require('bcryptjs');
const pass = 'admin123';

bcrypt.hash(pass, 10).then(hash => {
    console.log(`NEW HASH: ${hash}`);
    console.log(`HASH LENGTH: ${hash.length}`);
    bcrypt.compare(pass, hash).then(res => {
        console.log(`Verify Match: ${res}`);
    });
});
