require('dotenv').config();
const { ensureSchema, DB_PATH } = require('./index');

ensureSchema();
console.log(`Database schema ready at ${DB_PATH}`);
