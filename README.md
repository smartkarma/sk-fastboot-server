# Smartkarma Fastboot Server

This README outlines the details of collaborating on this Ember application.
A short introduction of this app could easily go here.

## Prerequisites

You will need the following things properly installed on your computer.

* [Git](https://git-scm.com/)
* [NVM](https://github.com/creationix/nvm) recommended to install Node
* [Node.js](https://nodejs.org/) v6.x (or above)
* [Yarn](https://yarnpkg.com/en/)

## Installation

* `git clone <repository-url>` this repository
* `cd sk-fastboot-server`
* Copy `.env.example` to `.env` and provide correct values for your setup
* `nvm use` if you need to switch Node version
* `yarn install`

## Running / Development

* `node server.js` or `yarn run start`
* The server will download latest distribution from your `PACKAGE_URL` config and extract it on your `DEST_PATH` folder
* Test your server at [http://localhost:3000](http://localhost:3000). Change the port according to your config.

### Running ESLint

* `yarn run lint`
* This will check `server.js` and the files in `lib` folder
