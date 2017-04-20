require('dotenv').config();

const FastBootAppServer = require('fastboot-app-server');
const S3Downloader = require('./lib/s3-downloader');
const WebhookNotifier = require('./lib/webhook-notifier');

const rootURL = process.env.ROOT_URL;
const downloader = new S3Downloader({
  url: process.env.PACKAGE_URL,
  destPath: process.env.DEST_PATH,
});

const notifier = new WebhookNotifier();

const server = new FastBootAppServer({
  downloader,
  notifier,
  rootURL,
  gzip: true,

  afterMiddleware: (app) => {
    app.post(process.env.DEPLOY_HOOK_URL, notifier.hook);
  },
});

server.start();
