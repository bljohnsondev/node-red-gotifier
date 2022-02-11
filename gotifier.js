const axios = require('axios').default;

module.exports = RED => {
  const stripEndingSlashes = url => {
    const matches = url.match(/^(.*?)\/\s*$/);
    return matches ? matches[1] : url;
  };

  const sendGotifyMessage = async ({ node, url, appkey, title, message }) => {
    if (!url || !appkey) {
      throw new Error('url or appkey is not defined');
    }

    // create the full URL and remove double slashes in case the url ends with /
    const gotifyUrl = `${stripEndingSlashes(url)}/message?token=${appkey}`;

    await axios.post(gotifyUrl, {
      title,
      message,
    });
  };

  const handleError = (node, done, err, msg) => {
    if (done) {
      // Node-RED 1.0 compatible
      done(err);
    } else {
      // Node-RED 0.x compatible
      node.error(err, msg);
    }
  };

  const getStringOrMessageValue = (msg, propType, prop) => {
    return propType === 'msg' ? RED.util.getMessageProperty(msg, prop) : prop;
  };

  function GotifierNode(config) {
    RED.nodes.createNode(this, config);

    const node = this;

    // clear any previous status messages
    node.status({});

    const server = RED.nodes.getNode(config.server);

    node.on('input', async (msg, send, done) => {
      const title = getStringOrMessageValue(msg, config.titleType, config.title);
      const message = getStringOrMessageValue(msg, config.messageType, config.message);

      try {
        node.status({ fill: 'green', shape: 'ring', text: 'sending message' });

        await sendGotifyMessage({
          node,
          url: server.url,
          appkey: server.credentials.appkey,
          title,
          message,
        });

        node.status({});

        send(msg);

        if (done) {
          done();
        }
      } catch (ex) {
        node.status({ fill: 'red', shape: 'dot', text: 'error sending' });
        handleError(node, done, ex, msg);
      }
    });
  }

  RED.nodes.registerType('gotifier', GotifierNode);

  function GotifyServerNode(config) {
    RED.nodes.createNode(this, config);
    this.name = config.name;
    this.url = config.url;
  }

  RED.nodes.registerType('gotify-server', GotifyServerNode, {
    credentials: {
      appkey: { type: 'text' },
    },
  });
};
