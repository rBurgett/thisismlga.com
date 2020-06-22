const jimp = require('jimp');
const fs = require('fs-extra-promise');
const path = require('path');
const generateVideos = require('./scripts/generate-videos');

(async function() {
  try {

    const imagesDir = path.join(__dirname, 'media', 'images');

    const files = await fs.readdirAsync(imagesDir);
    const episodeImages = files
      .filter(f => /^\w+_\d+\.\w+/.test(f))
      .map(f => path.join(imagesDir, f))
      .slice(-1);

    for(let i = 0; i < episodeImages.length; i++) {
      console.log(`${i + 1} of ${episodeImages.length}`);
      const imagePath = episodeImages[i];
      const ext = path.extname(imagePath);
      const videoImageName = `${path.basename(imagePath, ext)}-video${ext}`;
      const finalImagePath = path.join(imagesDir, videoImageName);
      const exists = await fs.existsAsync(finalImagePath);
      if(exists) continue;
      const image = await jimp.read(imagePath);
      image.resize(1000, 1000);
      const backgroundImage = await jimp.read(path.join(imagesDir, 'black_16x9.png'));
      backgroundImage.composite(image, (2000 / 2) -  500, (1125 / 2) - 500);
      await backgroundImage.writeAsync(finalImagePath);
    }

    generateVideos();

  } catch(err) {
    console.error(err);
  }
})();
