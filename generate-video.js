const Converter = require('mp3-to-video');
const fs = require('fs-extra-promise');
const path = require('path');
const colors = require('colors');

const imagePath = '';
const audioPath = '';
const destination = path.join(__dirname, 'videos', '');

const converter = new Converter(audioPath, 'mp4', imagePath);
converter.init(async function(err, res) {
  if(err) {
    console.error(err);
  } else {
    await fs.moveAsync(res.videoPath, destination, {overwrite: true});
    console.log(colors.green(`Video can be found at: ${destination}`));
  }
});
