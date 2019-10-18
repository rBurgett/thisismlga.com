const rmrf = require('rmrf-promise');
const path = require('path');

(async function() {
  try {
    await rmrf(path.resolve(__dirname, '..', 'dist'));
  } catch(err) {
    console.error(err);
  }
})();
