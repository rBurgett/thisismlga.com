const fs = require('fs-extra-promise');
const path = require('path');

(async function() {
  try {

    const episodesDir = path.join(__dirname, 'data', 'episodes');
    const dirs = await fs.readdirAsync(episodesDir);
    for(const dir of dirs) {
      const filePath = path.join(episodesDir, dir, 'episode.json');
      const meta = await fs.readJsonAsync(filePath);
      // const imageName = `mlga_${dir}.jpg`;
      const newDescription = meta.DESCRIPTION
        .trim()
        .replace(/\s+/g, ' ');
      const newMeta = Object.assign({}, meta, {
        DESCRIPTION: newDescription,
        CONTENT: newDescription
        // IMAGE: imageName,
        // ITUNES_IMAGE: imageName
      });
      await fs.writeJsonAsync(filePath, newMeta);
    }

    console.log('Done!');

  } catch(err) {
    console.error(err);
  }
})();
