const Converter = require('mp3-to-video');
const fs = require('fs-extra-promise');
const path = require('path');
const colors = require('colors');
const Jimp = require('jimp');
const sizeOf = require('image-size');

const fileExists = filePath => {
  try {
    fs.statSync(filePath);
    return true;
  } catch(err) {
    return false;
  }
};

const base = path.resolve(__dirname, '..');
const mediaDir = path.join(base, 'media');
const dataDir = path.join(base, 'data');
const tempDir = path.join(base, 'temp');
fs.ensureDirSync(tempDir);
const videosDir = path.join(base, 'videos');
fs.ensureDirSync(videosDir);

const getEpisodes = async function() {
  const episodesDir = path.join(dataDir, 'episodes');
  const folders = await fs.readdirAsync(episodesDir);
  const episodes = [];
  for(const folder of folders) {
    const episodeDir = path.join(episodesDir, folder);
    const data = await fs.readJsonAsync(path.join(episodeDir, 'episode.json'));
    const notes = await fs.readFileAsync(path.join(episodeDir, 'notes.md'), 'utf8');
    episodes.push(Object.assign({}, data, {NOTES: notes}));
  }
  return episodes;
};

const generateVideos = async function() {
  try {

    let episodes = await getEpisodes();
    episodes = episodes.slice(-1);

    const ext = 'mp4';

    for(const episode of episodes) {
      const { FILE } = episode;
      let { IMAGE } = episode;
      const mp3FilePath = path.join(mediaDir,'audio', FILE);
      const videoFilePath = path.join(videosDir, path.basename(FILE, '.mp3') + '.' + ext);
      if(fileExists(videoFilePath)) continue;
      const imageExt = path.extname(IMAGE);
      IMAGE = `${path.basename(IMAGE, imageExt)}-video${imageExt}`;
      const origImagePath = path.join(mediaDir, 'images', IMAGE);
      const tempImagePath = path.join(tempDir, IMAGE);
      const dimensions = sizeOf(origImagePath);
      const image = await Jimp.read(origImagePath);
      await image
        .crop(0, 0, dimensions.width - 20, dimensions.height)
        .resize(1080, Jimp.AUTO)
        // .cover(800, 450, Jimp.VERTICAL_ALIGN_MIDDLE)
        .write(tempImagePath);
      await new Promise((resolve, reject) => {
        console.log(`Generating Video for ${mp3FilePath}`);
        const converter = new Converter(mp3FilePath, 'mp4', tempImagePath);
        converter.init(async function(err, res) {
          if(err) {
            reject(err);
          } else {
            await fs.moveAsync(res.videoPath, videoFilePath, {overwrite: true});
            console.log(colors.green(`Video can be found at: ${videoFilePath}`));
            resolve();
          }
        });
      });
      await fs.removeAsync(tempImagePath);
    }
  } catch(err) {
    console.error(err);
  }
};

module.exports = generateVideos;
