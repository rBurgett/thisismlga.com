const fs = require('fs-extra-promise');
const path = require('path');

(async function() {
  try {
    const episodesDir = path.join(__dirname, 'data', 'episodes');
    const dirs = await fs.readdirAsync(episodesDir);
    for(const dir of dirs) {
      const filePath = path.join(episodesDir, dir, 'notes.md');
      const contents = await fs.readFileAsync(filePath, 'utf8');
      const newContents = contents.replace(/(http.+?)(\s)/g, '[$1]($1)$2');
      await fs.writeFileAsync(filePath, newContents, 'utf8');
    }
  } catch(err) {
    console.error(err);
  }
})();
