const Handlebars = require('handlebars');
const fs = require('fs-extra-promise');
const path = require('path');
const Feed = require('podcast');
const Markdown = require('markdown-it');
const crypto = require('crypto');
const generateVideos = require('./generate-videos');
const Jimp = require('jimp');
const moment = require('moment');

const flags = require('commander')
  .option('--tor', true)
  .parse(process.argv);

const torBuild = flags.tor || false;

const removeAnalytics = str => {
  const analyticsPatt = /<.+Google\sAnalytics.+>(.|\n)+?<.+Google\sAnalytics.+>/;
  if(!analyticsPatt.test(str)) return str;
  return str.replace(analyticsPatt, '');
};

const markdown = new Markdown();

Handlebars.registerHelper('render', str => markdown.render(str));
Handlebars.registerHelper('formatDate', isoDate => moment(isoDate).format('YYYY-MM-DD'));

const base = path.resolve(__dirname, '..');
const templatesDir = path.join(base, 'templates');
const publicDir = path.join(base, 'public');
const mediaDir = path.join(base, 'media');
const dataDir = path.join(base, 'data');

const outputDir = path.join(base, 'dist');

const generateGuidFromString = str => {
  const hash = crypto.createHash('sha256');
  hash.update(str);
  const hashed = hash.digest('hex');
  return hashed.slice(0, 8) + '-' + hashed.slice(8, 12) + '-' + hashed.slice(12, 16) + '-' + hashed.slice(16, 20) + '-' + hashed.slice(20, 32);
};

const getEpisodes = async function() {
  const episodesDir = path.join(dataDir, 'episodes');
  const folders = await fs.readdirAsync(episodesDir);
  const episodes = [];
  for(const folder of folders) {
    const episodeDir = path.join(episodesDir, folder);
    const stat = await fs.statAsync(episodeDir);
    if (!stat.isDirectory()) continue;
    const data = await fs.readJsonAsync(path.join(episodeDir, 'episode.json'));
    const notes = await fs.readFileAsync(path.join(episodeDir, 'notes.md'), 'utf8');
    episodes.push(Object.assign({}, data, {NOTES: notes}));
  }
  return episodes;
};

(async function() {
  try {

    const siteData = await fs.readJsonAsync(path.join(dataDir, 'site.json'));

    const { blacklist: blacklistArr = [] } = siteData;
    const blacklist = new Set(blacklistArr);

    if(torBuild) {
      siteData.SITE_URL = siteData.SITE_URL_TOR;
      siteData.META_IMAGE = siteData.META_IMAGE_TOR;
      siteData.META_IMAGE_WIDTH = siteData.META_IMAGE_WIDTH_TOR;
      siteData.META_IMAGE_HEIGHT = siteData.META_IMAGE_HEIGHT_TOR;
    }

    const indexData = await fs.readJsonAsync(path.join(dataDir, 'index.json'));

    await fs.ensureDirAsync(outputDir);

    const publicFiles = await fs.readdirAsync(publicDir);
    for(const file of publicFiles) {
      await fs.copyAsync(path.join(publicDir, file), path.join(outputDir, file));
    }

    const mediaFiles = await fs.readdirAsync(mediaDir);
    for(const file of mediaFiles) {
      await fs.copyAsync(path.join(mediaDir, file), path.join(outputDir, file));
    }

    const episodes = await getEpisodes();
    episodes.sort((a, b) => a.NUMBER === b.NUMBER ? 0 : a.NUMBER > b.NUMBER ? -1 : 1);

    // Generate Feed and Episode pages
    {

      let templateSource = await fs.readFileAsync(path.join(templatesDir, 'episode.hbs'), 'utf8');
      if(torBuild) templateSource = removeAnalytics(templateSource);
      const episodeTemplate = Handlebars.compile(templateSource);

      const now = new Date().toISOString();
      const feedUrl = `${siteData.SITE_URL}/feed.rss`;
      const feed = new Feed({
        title: siteData.SITE_NAME,
        description: siteData.META_DESCRIPTION,
        feed_url: feedUrl,
        site_url: siteData.SITE_URL,
        image_url: `${siteData.SITE_URL}/images/${siteData.META_IMAGE}`,
        managingEditor: siteData.managingEditor,
        webMaster: siteData.WEBMASTER,
        copyright: siteData.COPYRIGHT,
        language: siteData.LANGUAGE,
        categories: siteData.CATEGORIES,
        pubDate: now,
        itunesAuthor: siteData.AUTHOR,
        itunesEmail: siteData.EMAIL,
        itunesOwner: {
          name: siteData.AUTHOR,
          email: siteData.EMAIL
        },
        itunesCategory: siteData.ITUNES_CATEGORY,
        itunesImage: `${siteData.SITE_URL}/images/${siteData.ITUNES_IMAGE}`,
        itunesExplicit: siteData.EXPLICIT,
        customElements: [
          {'itunes:new-feed-url': feedUrl}
        ]
      });

      const feedLimit = siteData.FEED_LIMIT;

      for(let i = 0; i < episodes.length; i++) {
        let episode = episodes[i];

        if(blacklist.has(episode.NUMBER))
          continue;

        const SHOW_IN_FEED = !feedLimit || i < feedLimit;
        episodes[i].SHOW_IN_FEED = SHOW_IN_FEED;

        episode = Object.assign({}, siteData, episode);
        episode.IMAGE = episode.IMAGE || siteData.META_IMAGE;
        episode.ITUNES_IMAGE = episode.ITUNES_IMAGE || siteData.ITUNES_IMAGE;
        const imageFilePath = path.join(mediaDir, 'images', episode.IMAGE);
        const image = await Jimp.read(imageFilePath);
        const { width, height } = image.bitmap;
        episode.IMAGE_WIDTH = width;
        episode.IMAGE_HEIGHT = height;
        const localFilePath = path.join(mediaDir, 'audio', episode.FILE);
        const { birthtime } = await fs.statAsync(localFilePath);
        if(SHOW_IN_FEED) {
          feed.addItem({
            title: episode.TITLE,
            url: `${siteData.SITE_URL}/${episode.NUMBER}`,
            description: episode.DESCRIPTION,
            guid: episode.GUID ? episode.GUID : generateGuidFromString(episode.TITLE + episode.NUMBER),
            date: episode.DATE || birthtime,
            enclosure: {
              url: `${siteData.SITE_URL}/audio/${episode.FILE}`,
              file: localFilePath
            },
            itunesImage: `${siteData.SITE_URL}/images/${episode.IMAGE}`,
            itunesExplicit: episode.EXPLICIT || siteData.EXPLICIT,
            customElements: [
              {'content:encoded': {_cdata: markdown.render(episode.CONTENT)}}
            ]
          });
        }

        const episodeDir = path.join(outputDir, String(episode.NUMBER));
        await fs.ensureDirAsync(episodeDir);

        const output = episodeTemplate(episode);
        await fs.writeFileAsync(path.join(episodeDir, 'index.html'), output, 'utf8');
      }

      // Generate index.html
      {
        let indexSource = await fs.readFileAsync(path.join(templatesDir, 'index.hbs'), 'utf8');
        if(torBuild) indexSource = removeAnalytics(indexSource);
        const indexTemplate = Handlebars.compile(indexSource);
        const output = indexTemplate(Object.assign({}, siteData, indexData, { episodes }));
        await fs.writeFileAsync(path.join(outputDir, 'index.html'), output, 'utf8');
      }

      // Generate store
      {
        const storeData = await fs.readJsonAsync(path.join(dataDir, 'store.json'));
        let storeSource = await fs.readFileAsync(path.join(templatesDir, 'store.hbs'), 'utf8');
        if(torBuild) storeSource = removeAnalytics(storeSource);
        const storeTemplate = Handlebars.compile(storeSource);
        const output = storeTemplate(Object.assign({}, siteData, indexData, storeData));
        const storeDir = path.join(outputDir, 'store');
        await fs.ensureDirAsync(storeDir);
        await fs.writeFileAsync(path.join(storeDir, 'index.html'), output, 'utf8');
      }

      const rssFeed = feed.buildXml('  ');
      await fs.writeFileAsync(path.join(outputDir, 'feed.rss'), rssFeed, 'utf8');
    }

    if(torBuild) {
      const faviconPath = path.join(outputDir, 'favicon.ico');
      await fs.removeAsync(faviconPath);
      await fs.moveAsync(path.join(outputDir, 'favicon_sm.ico'), faviconPath);
    } else {
      // await generateVideos();
    }

  } catch(err) {
    console.error(err);
  }
})();
