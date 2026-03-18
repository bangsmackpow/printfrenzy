const bcrypt = require('bcryptjs');
const hash = '$2a$10$7sE8S.TzD6T9P7d6zF.vXuWqV7.L/t0wYh5oG1v8O9nF0b1kS1vW';
const pass = 'admin123';

bcrypt.compare(pass, hash).then(res => {
    console.log(`Password Match: ${res}`);
});
