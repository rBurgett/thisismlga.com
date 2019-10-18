const s3 = require('s3');
const path = require('path');

const client = s3.createClient({
  multipartUploadThreshhold: 1000000000,
  multipartUploadSize: 1000000000
});

const params = {
  localDir: path.resolve(__dirname, '..', 'dist'),
  deleteRemoved: true,
  s3Params: {
    Bucket: process.env.S3_BUCKET,
    // prefix: '/',
    ACL: 'public-read'
  }
};
const uploader = client.uploadDir(params);
uploader.on('error', console.error);
uploader.on('progress', () => {
  console.log('progress', uploader.progressAmount, uploader.progressTotal);
});
uploader.on('end', () => {
  console.log('Done!');
});
