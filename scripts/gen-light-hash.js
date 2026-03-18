const bcrypt = require('bcryptjs');
const pass = 'admin123';

bcrypt.hash(pass, 4).then(hash => {
    console.log(`4-ROUND HASH: ${hash}`);
});
