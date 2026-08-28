require('dotenv').config();

// Keep non-experimental warnings visible while avoiding noisy runtime logs.
process.removeAllListeners('warning');
process.on('warning', (w) => {
  if (w.name !== 'ExperimentalWarning') console.warn(w);
});

const app = require('./app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`BullyShield API listening on port ${PORT}`);
});
