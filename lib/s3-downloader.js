// Inspired by https://github.com/habdelra/ember-fastboot-deploy

const fs = require('fs');
const ncp = require('ncp');
const path = require('path');
const request = require('request');
const rimraf = require('rimraf');
const targz = require('targz');
const uuidV4 = require('uuid/v4');

const AppNotFoundError = function AppNotFoundError(message) {
  const error = new Error(message);
  error.name = 'AppNotFoundError';

  return error;
};

const getPackage = function getPackage(url, filePath) {
  return new Promise((resolve, reject) => {
    request.get(url)
      .on('response', (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Could not download fastboot package, HTTP response was ${response.statusCode} ${response.statusMessage}`));
        }
      }).on('error', reject)
      .pipe(fs.createWriteStream(filePath))
      .on('finish', () => {
        resolve();
      });
  });
};

const extractPackage = function extractPackage(srcFile, destPath) {
  return new Promise((resolve, reject) => {
    targz.decompress({
      src: srcFile,
      dest: destPath,
    }, error => (error ? reject(error) : resolve()));
  });
};

const clearFolder = function clearFolder(pathName) {
  return new Promise((resolve, reject) => {
    rimraf(`${pathName}/*`, error => (error ? reject(error) : resolve()));
  });
};

const copyFile = function copyFile(src, dest) {
  return new Promise((resolve, reject) => {
    ncp(src, dest, error => (error ? reject(error) : resolve()));
  });
};

class S3Downloader {
  constructor(options) {
    this.ui = options.ui;
    this.sourceURL = options.url;
    this.destPath = options.destPath;
    this.tmpPath = options.tmpPath || 'tmp/';
    this.deployFolder = options.deployFolder || 'deploy-dist';
  }

  download() {
    if (!this.sourceURL || !this.destPath) {
      this.ui.writeError('no url or destPath provided; not downloading app');
      return Promise.reject(new AppNotFoundError());
    }

    const randomID = uuidV4();
    const pkgFile = path.join(this.tmpPath, `${randomID}.tar.gz`);
    const extractPath = path.join(this.tmpPath, randomID);
    const deployPath = path.join(extractPath, this.deployFolder);
    return getPackage(this.sourceURL, pkgFile).then(() => {
      if (!fs.existsSync(pkgFile)) {
        throw new AppNotFoundError('no fastboot package in s3');
      }

      // Extract downloaded file
      return extractPackage(pkgFile, extractPath);
    }).then(() => {
      if (!fs.existsSync(deployPath)) {
        throw new AppNotFoundError('no deploy folder in package');
      }

      // Clean destination folder
      return clearFolder(this.destPath);
    }).then(() => copyFile(deployPath, this.destPath))
    .then(() => {
      // Remove extract folder
      rimraf(extractPath, error => (error && this.ui.writeError('Error removing extract folder')));

      // Remove downloaded file
      rimraf(pkgFile, error => (error && this.ui.writeError('Error removing downloaded package')));

      return this.destPath;
    });
  }
}

module.exports = S3Downloader;
