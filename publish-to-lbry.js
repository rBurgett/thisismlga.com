const request = require('superagent');
const fs = require('fs-extra-promise');
const path = require('path');

/*
http://localhost:5279/
{
  "method": "publish",
  "params": {
    "name": "a-new-stream",
    "bid": "1.0",
    "file_path": "/tmp/tmpxe9u833p",
    "validate_file": false,
    "optimize_file": false,
    "tags": [],
    "languages": [],
    "locations": [],
    "channel_account_id": [],
    "funding_account_ids": [],
    "preview": false,
    "blocking": false}
}
*/

const base = path.resolve(__dirname);
const mediaDir = path.join(base, 'media');
const dataDir = path.join(base, 'data');
const videosDir = path.join(base, 'videos');

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

const getConfirmations = async function(permanentUrl) {
  const { body } = await request
    .post('http://localhost:5279')
    .set('Content-Type', 'application/json')
    .send({
      method: 'resolve',
      params: {
        urls: permanentUrl
        // urls: "@ThisIsMLGA#5facca4f15c52328f8f8557052be6edc2285a697"
        // urls: '@TechnoAgorist#8/ta_0013#f'
        // urls: 'iphone-video-camera#2659b289a213993e907ade68027472f65d56e72b'
        // urls: 'pewdiepie#a'
      }
    });
  return body.result[permanentUrl].confirmations;
};

(async function() {
  try {

    const episodes = await getEpisodes();

    // console.log(JSON.stringify(episodes[episodes.length - 1], null, '  '));

    // const { body } = await request
    //   .post('http://localhost:5279')
    //   .set('Content-Type', 'application/json')
    //   .send({
    //     method: 'account_list',
    //     params: {
    //       show_seed: true
    //     }
    //   });
    // console.log(JSON.stringify(body, null, '  '));
    // await fs.writeJsonAsync('wallets.json', body);
    // return;

    // const { body } = await request
    //   .post('http://localhost:5279')
    //   .set('Content-Type', 'application/json')
    //   .send({
    //     method: 'transaction_show',
    //     params: {
    //       txid: ''
    //       // txid: 'a8aaa467af90f4bf688aa52fea2b8acdfeef17ab3fbcfcc0cbcc6a49c8682e80'
    //     }
    //   });
    // console.log(JSON.stringify(body, null, '  '));
    // return;

    // const { body } = await request
    //   .post('http://localhost:5279')
    //   .set('Content-Type', 'application/json')
    //   .send({
    //     method: 'get',
    //     params: {
    //       uri: 'lbry://@ThisIsMLGA#5/mlga_0029#e',
    //       download_directory: '/home/ryan/projects/thisismlga.com'
    //     }
    //   });
    // console.log(JSON.stringify(body, null, '  '));
    // return;

    // const { body } = await request
    //   .post('http://localhost:5279')
    //   .set('Content-Type', 'application/json')
    //   .send({
    //     method: 'resolve',
    //     params: {
    //       urls: 'mlga_0003#1bfc786899a27713839018ecba76e2372e9920db'
    //       // urls: "@ThisIsMLGA#5facca4f15c52328f8f8557052be6edc2285a697"
    //       // urls: '@TechnoAgorist#8/ta_0013#f'
    //       // urls: 'iphone-video-camera#2659b289a213993e907ade68027472f65d56e72b'
    //       // urls: 'pewdiepie#a'
    //     }
    //   });
    // console.log(JSON.stringify(body, null, '  '));
    // return;

    // const confirmations = await getConfirmations('mlga_0005#7e753be89b7c49fe542b17ad9a697936ef6b16ae');
    // return console.log('confirmations', confirmations);

    // const permanentUrl = 'mlga_0007#bb928c15dad725883c12a787e42d175e6f483300';
    // let confirmations = await getConfirmations(permanentUrl);
    // console.log(`${confirmations} confirmations`);
    // while(true) {
    //   await new Promise(resolve => setTimeout(resolve, 30000));
    //   const newConfirmations = await getConfirmations(permanentUrl);
    //   if(confirmations !== newConfirmations) {
    //     confirmations = newConfirmations;
    //     console.log(`${confirmations} confirmations`);
    //   }
    // }
    // return;

    for(const episode of episodes.slice(-1)) {

      const { NUMBER } = episode;
      let numberStr = NUMBER.toString();
      while(numberStr.length < 4) {
        numberStr = '0' + numberStr;
      }

      const name = `mlga_${numberStr}`;
      console.log(name);

      const params = {
        name,
        bid: '1.0',
        file_path: path.join(videosDir, `mlga_${numberStr}.mp4`),
        validate_file: true,
        optimize_file: true,
        title: episode.TITLE,
        description: episode.DESCRIPTION,
        thumbnail_url: `https://thisismlga.com/images/mlga_${numberStr}-video.jpg`,
        author: 'Cam Harless',
        tags: [],
        languages: ['en'],
        locations: [{country: 'US'}],
        channel_name: '@ThisIsMLGA',
        license: 'Creative Commons Attribution-NonCommercial 4.0 International License',
        license_url: 'https://creativecommons.org/licenses/by-nc/4.0/',
        channel_account_id: [],
        funding_account_ids: [],
        preview: false,
        blocking: false
      };

      const { statusCode, body } = await request
        .post('http://localhost:5279')
        .set('Content-Type', 'application/json')
        .send({
          method: 'publish',
          params
        });

      // console.log(statusCode);

      // console.log(JSON.stringify(body, null, '  '));

      if(body.error) {
        console.log(JSON.stringify(body, null, '  '));
        break;
      }

      // console.log('awaiting confirmation');

      const permanentUrl = body.result.outputs[0].permanent_url.trim().replace(/^lbry:\/\//, '');

      console.log(permanentUrl);

      let confirmations = await getConfirmations(permanentUrl);
      confirmations = confirmations || 0;
      // console.log(confirmations, 'confirmations');
      while(confirmations < 1) {
        await new Promise(resolve => setTimeout(resolve, 30000));
        let newConfirmations = await getConfirmations(permanentUrl);
        newConfirmations = newConfirmations || 0;
        if(newConfirmations !== confirmations) {
          confirmations = newConfirmations;
          // console.log(confirmations, 'confirmations');
        }
      }
      // console.log(confirmations, 'confirmations!');
      console.log('Confirmed!');

      // await new Promise(resolve => setTimeout(resolve, 660000));

    }

  } catch(err) {
    console.error(err);
  }
})();
