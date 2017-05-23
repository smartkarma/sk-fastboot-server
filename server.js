require('dotenv').config();

const express = require('express');
const path = require('path');
const FastBootAppServer = require('fastboot-app-server');
const S3Downloader = require('./lib/s3-downloader');
const WebhookNotifier = require('./lib/webhook-notifier');

const deployHookURL = process.env.DEPLOY_HOOK_URL;
const rootURL = process.env.FASTBOOT_ROOT_URL;
const fastbootDistPath = process.env.FASTBOOT_DIST;
const fastbootPackageURL = process.env.FASTBOOT_PACKAGE_URL;
const fastbootExtractionPath = process.env.FASTBOOT_EXTRACT_PATH;
const staticDistPath = process.env.STATIC_DIST;
const indexFile = path.join(staticDistPath, 'index.html');

const notifier = new WebhookNotifier();

const serverSettings = {
  rootURL,
  notifier,
  gzip: true,

  beforeMiddleware: (app) => {
    if (rootURL && rootURL !== '/') {
      const rootWithoutSlash = rootURL.slice(0, -1);
      app.get(rootWithoutSlash, (req, res, next) => {
        if (req.originalUrl === rootWithoutSlash) {
          return res.redirect(302, rootURL);
        }
        return next();
      });
    }
  },

  afterMiddleware: (app) => {
    app.post(deployHookURL, notifier.hook);
    app.use(express.static(staticDistPath));
    app.use('*', (req, res, next) => {
      res.sendFile(indexFile, err => (err && next(err)));
    });
  },
};

if (fastbootPackageURL && fastbootExtractionPath) {
  const downloader = new S3Downloader({
    url: fastbootPackageURL,
    destPath: fastbootExtractionPath,
  });

  serverSettings.downloader = downloader;
} else {
  serverSettings.distPath = fastbootDistPath;
}

const server = new FastBootAppServer(serverSettings);
server.start();
