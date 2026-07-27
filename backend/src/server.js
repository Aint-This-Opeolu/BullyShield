require('dotenv').config();

// node:sqlite is stable enough for this app's needs; silence the
// experimental-feature warning so server logs stay clean.
process.removeAllListeners('warning');
process.on('warning', (w) => {
  if (w.name !== 'ExperimentalWarning') console.warn(w);
});

const app = require('./app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`BullyShield API listening on port ${PORT}`);
});
