const s3 = require('s3');
const fs = require('fs-extra-promise');
const path = require('path');
const AWS = require('aws-sdk');
const request = require('superagent');

const cloudfront = new AWS.CloudFront({apiVersion: '2019-03-26'});

const client = s3.createClient({
  multipartUploadThreshhold: 1000000000,
  multipartUploadSize: 1000000000
});

const cdnInvalidations = () => new Promise((resolve, reject) => {
  const invalidationParams = {
    DistributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID,
    InvalidationBatch: {
      CallerReference: String(new Date().getTime()),
      Paths: {
        Quantity: 4,
        Items: [
          '/',
          '/css/*',
          '/index.html',
          '/feed.rss'
        ]
      }
    }
  };
  cloudfront.createInvalidation(invalidationParams, err => {
    if(err) reject(err);
    else resolve();
  });
});

const uploadDir = (dir, prefix = '') => new Promise((resolve, reject) => {
  const params = {
    localDir: dir,
    deleteRemoved: true,
    s3Params: {
      Bucket: process.env.S3_BUCKET,
      Prefix: prefix,
      ACL: 'public-read'
    }
  };
  const uploader = client.uploadDir(params);
  uploader.on('error', reject);
  uploader.on('progress', () => {
    console.log('progress', uploader.progressAmount, uploader.progressTotal);
  });
  uploader.on('end', () => {
    resolve();
  });
});

const uploadFile = (filePath, key) => new Promise((resolve, reject) => {
  const params = {
    localFile: filePath,
    s3Params: {
      Bucket: process.env.S3_BUCKET,
      Key: key,
      ACL: 'public-read'
    }
  };
  const uploader = client.uploadFile(params);
  uploader.on('error', reject);
  uploader.on('progress', () => {
    console.log('progress', uploader.progressAmount, uploader.progressTotal);
  });
  uploader.on('end', () => {
    resolve();
  });
});

(async function() {
  try {

    const distPath = path.resolve(__dirname, '..', 'dist');

    let files = await fs.readdirAsync(distPath);
    files = files
      .filter(f => !/^\./.test(f))
      .filter(f => f !== 'audio');
    for(const fileName of files) {
      const filePath = path.join(distPath, fileName);
      const stats = await fs.statAsync(filePath);
      const isDir = stats.isDirectory();
      if(isDir) { // it is a directory
        await uploadDir(filePath, fileName + '/');
      } else { // it is a file
        await uploadFile(filePath, fileName);
      }
    }

    const url = `https://s3.amazonaws.com/${process.env.S3_BUCKET}/audio/`;
    const audioDir = path.join(distPath, 'audio');
    const audioFiles = await fs.readdirAsync(audioDir);
    for(const fileName of audioFiles) {
      const filePath = path.join(audioDir, fileName);
      let status;
      try {
        const res = await request.head(url + fileName);
        status = res.status;
      } catch(err) {
        status = err.status;
      }
      if(status !== 200) {
        await uploadFile(filePath, 'audio/' + fileName);
      }
    }

    await cdnInvalidations();

    console.log('Done!');

  } catch(err) {
    console.error(err);
  }
})();
