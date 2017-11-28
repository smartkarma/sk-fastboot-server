require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const request = require('request');
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

// Add create Ember Simple Auth cookie
function safeJsonParse(json) {
  try {
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

function addCookie(req, res, next) {
  const hasSilentHeaders = Boolean(req.headers && req.headers['silent-auth']);
  const authData = hasSilentHeaders && safeJsonParse(req.headers['silent-auth']);
  if (authData) {
    const data = JSON.stringify({
      authenticated: {
        account_id: authData.account_id,
        authenticator: 'authenticator:devise',
        email: authData.email,
        token: authData.token,
      },
    });
    res.cookie('ember_simple_auth-session', data, { maxAge: 2592000 });
  }
  next();
}

const serverSettings = {
  rootURL,
  notifier,
  gzip: true,

  beforeMiddleware: (app) => {
    app.use(cookieParser());
    // try to add auth cookie if Silent-Auth headers are set
    app.use(addCookie);
    // root URL without slash
    if (rootURL && rootURL !== '/') {
      const rootWithoutSlash = rootURL.slice(0, -1);
      app.get(rootWithoutSlash, (req, res, next) => {
        if (req.originalUrl === rootWithoutSlash) {
          return res.redirect(302, rootURL);
        }
        return next();
      });
    }

    app.get(/\/home\/*/, (req, res, next) => {
      res.header('Cache-Control', 'public, max-age=2592000');
      next();
    });

    // For index page
    app.get('/', (req, res, next) => {
      const cookie = req.cookies['ember_simple_auth-session'];
      const auth = cookie && (typeof cookie === 'string') && JSON.parse(cookie);

      // If user is not logged in, redirect to sk-public
      if (!auth || !auth.authenticated || !auth.authenticated.account_id) {
        return res.redirect(302, rootURL);
      }

      // Serve smartkarma-web
      setAuthCookie();
      return res.sendFile(indexFile, err => (err && next(err)));
    });
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
const start = server.start();
if (start) {
  start.then(() => {
    if (process.env.REPORT_HOOK_URL) {
      request.post(process.env.REPORT_HOOK_URL, {
        form: {
          text: `*${process.env.SERVER_NAME}*: Server has started.`,
        },
      });
    }
  });
}
