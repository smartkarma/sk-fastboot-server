require('dotenv').config();

const express = require('express');
const path = require('path');
const FastBootAppServer = require('fastboot-app-server');
const S3Downloader = require('./lib/s3-downloader');
const WebhookNotifier = require('./lib/webhook-notifier');

const deployHookURL = process.env.DEPLOY_HOOK_URL;
const rootURL = process.env.FASTBOOT_ROOT_URL;
const fastbootPackageURL = process.env.FASTBOOT_PACKAGE_URL;
const fastbootExtractionPath = process.env.FASTBOOT_EXTRACT_PATH;
const staticDistPath = process.env.STATIC_DIST;
const indexFile = path.join(staticDistPath, 'index.html');

const downloader = new S3Downloader({
  url: fastbootPackageURL,
  destPath: fastbootExtractionPath,
});

const notifier = new WebhookNotifier();

const server = new FastBootAppServer({
  downloader,
  notifier,
  rootURL,
  gzip: true,

  afterMiddleware: (app) => {
    app.post(deployHookURL, notifier.hook);
    app.use(express.static(staticDistPath));
    app.use('*', (req, res, next) => {
      res.sendFile(indexFile, err => (err && next(err)));
    });
  },
});

server.start();
