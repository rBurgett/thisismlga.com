const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');

const { PORT = 3300 } = process.env;

const publicDir = path.join(__dirname, 'dist');

const app = express()
  .use(favicon(path.join(publicDir, 'favicon.ico')))
  .use(express.static(publicDir));

const server = app.listen(PORT, () => {
  console.log('App listening at port', server.address().port);
});
