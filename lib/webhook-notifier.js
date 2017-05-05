const cluster = require('cluster');

const messageEvent = 'webhook-notify';

const hook = function hook(req, res) {
  try {
    if (!cluster.isWorker) {
      throw new Error('Deploy webhook should only be called from the workers');
    }

    process.send({ event: messageEvent });
    if (this.ui) {
      this.ui.writeLine('Message sent to master:', messageEvent);
    }
    return res.status(200).send('Done').end();
  } catch (e) {
    if (this.ui) {
      this.ui.writeError(e.message);
    }
    return res.status(500).send(e.message).end();
  }
};

class WebhookNotifier {
  constructor() {
    this.hook = hook.bind(this);
  }

  subscribe(notify) {
    cluster.on('message', (worker, message) => {
      if (message.event === messageEvent) {
        if (this.ui) {
          this.ui.writeLine('Message received:', message.event);
        }
        notify();
      }
    });

    return Promise.resolve();
  }
}

module.exports = WebhookNotifier;
