import WebSocket from 'ws';

/**
 * Initializes the socket connected to the specified endpoint.
 * Allows you to define custom options. Token option is required.
 * @param {string} endpoint
 * @param {{
 *  debug?: boolean,
 *  initialReconnectTimeout?: number,
 *  reconnectTimeoutFactor?:number,
 *  maxReconnectTimeout?: number,
 *  keepAliveTimeout?: number,
 *  token: string,
 * }} customOptions
 * @returns {{
 *  on: () => void,
 *  subscribe: (channel: string, filter, callback: (data) => void) => void,
 *  unsubscribe: (channel:string) => void,
 *  close: () => void,
 * }}
 */
const messageBus = (endpoint, customOptions) => {
  const subscriptions = {};
  const pending = [];
  const pendingReplies = {};
  const events = {};
  const timeouts = {};
  let status = 'connecting';
  let socket;
  let lastActivityTimestamp;
  let reconnectTimeout;

  const options = {
    debug: customOptions.debug || false,
    initialReconnectTimeout: customOptions.initialReconnectTimeout || 1000,
    reconnectTimeoutFactor: customOptions.reconnectTimeoutFactor || 2,
    maxReconnectTimeout: customOptions.maxReconnectTimeout || 60000,
    keepAliveTimeout: customOptions.keepAliveTimeout || 30000,
    token: customOptions.token || null,
  };

  reconnectTimeout = options.initialReconnectTimeout;

  function debug(...args) {
    if (options.debug && console) {
      console.log.apply(this, args);
    }
  }

  debug(options);

  function recordActivity() {
    lastActivityTimestamp = new Date().getTime();
  }

  function send(data) {
    const dataStr = JSON.stringify(data);

    if (status !== 'connected') {
      pending.push(dataStr);
    } else {
      socket.send(dataStr);

      recordActivity();
    }

    debug(`message sent: ${dataStr}`);
  }

  function nextId() {
    if (options.nextId) return options.nextId();

    const result = [];
    const hexRef = [
      '0',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
    ];

    for (let n = 0; n < 16; n += 1) {
      result.push(hexRef[Math.floor(Math.random() * 16)]);
    }
    return result.join('');
  }

  function heartbeat() {
    if (status === 'connected') {
      if (
        !lastActivityTimestamp
          || new Date().getTime() - lastActivityTimestamp > options.keepAliveTimeout
      ) {
        debug('heartbeat');

        send({ id: nextId(), type: 'heartbeat' });
      }
    }
  }

  function setupHeartbeats() {
    debug('installing heartbeat');

    setInterval(() => {
      heartbeat();
    }, options.keepAliveTimeout);
  }

  function setStatus(newStatus) {
    debug(`status: ${newStatus}`);

    status = newStatus;

    if (events[status]) {
      events[status]();
    }
  }

  function connect() {
    debug(`connecting: ${endpoint}`);

    if (!endpoint) throw new Error('No endpoint to connect');

    let processedEndpoint;

    if (options.token) {
      if (/\?/.test(endpoint)) {
        processedEndpoint = `${endpoint}&token=${options.token}`;
      } else {
        processedEndpoint = `${endpoint}?token=${options.token}`;
      }
    }

    socket = new WebSocket(processedEndpoint);

    socket.on('open', () => {
      setStatus('connected');

      recordActivity();

      Object.values(subscriptions).forEach((channel) => {
        send({
          id: nextId(),
          type: 'subscribe',
          channel,
          filter: subscriptions[channel].filter,
        });

        debug(`resubscribed: ${channel}`);
      });

      while (pending.length) {
        socket.send(pending.shift());
      }
    });

    socket.on('message', (event) => {
      recordActivity();

      try {
        debug(`message received: ${event}`);

        const message = JSON.parse(event);

        if (message.type === 'event') {
          const subscription = subscriptions[message.channel];

          if (subscription) {
            subscription.callback(message.payload);
          }
        } else if (message.replyId && pendingReplies[message.replyId]) {
          debug(`resolved pending reply: ${message.replyId}`);

          if (message.type === 'ack') {
            pendingReplies[message.replyId][0]();
          } else {
            pendingReplies[message.replyId][1](message.payload.message);
          }

          delete pendingReplies[message.replyId];
        }
      } catch (e) {
        debug(e);
      }
    });

    socket.on('close', (event) => {
      if (event && !event.wasClean && status !== 'closed') {
        setStatus('reconnecting');

        debug('reconnect timeout: ', reconnectTimeout);

        timeouts.reconnect = setTimeout(() => {
          connect();
        }, reconnectTimeout);

        if (reconnectTimeout < options.maxReconnectTimeout) {
          reconnectTimeout *= options.reconnectTimeoutFactor;
        } else {
          reconnectTimeout = options.initialReconnectTimeout;
        }
      }
    });

    socket.on('error', () => {
      debug('websocket error');
    });
  }

  setupHeartbeats();

  connect();

  return {
    /**
     * Allows you to specify to execute a callback on a specific event
     * ---- TO BE IMPLEMENTED ----
     * @param {*} ev
     * @param {() => void} callback
     */
    on: (ev, callback) => {
      events[ev] = callback;
    },

    /**
     * Subscribes to the specified channel.
     * This allows you to specify a callback that will be executed when you receive a new message
     * @param {string} channel
     * @param {object} filter
     * @param {() => void} callback
     * @returns
     */
    subscribe: async (channel, filter, callback) => {
      if (subscriptions[channel]) {
        debug(`already subscribed: ${channel}`);

        throw new Error('Already subscribed');
      }
      const id = nextId();

      const data = {
        id,
        type: 'subscribe',
        channel,
      };

      if (filter != null) {
        data.filter = filter;
      }

      send(data);

      return new Promise((resolve, reject) => {
        pendingReplies[id] = [resolve, reject];
      }).then(() => {
        debug(`subscribed: ${channel}`);

        subscriptions[channel] = {};
        subscriptions[channel].callback = callback;
        subscriptions[channel].filter = filter;
      });
    },

    /**
     * Unsuscribes from the specified channel
     * @param {*} channel
     * @returns
     */
    unsubscribe: async (channel) => {
      if (subscriptions[channel]) {
        const id = nextId();

        send({
          id,
          type: 'unsubscribe',
          channel,
        });

        return new Promise((resolve, reject) => {
          pendingReplies[id] = [resolve, reject];
        }).then(() => {
          delete subscriptions[channel];

          debug(`unsubscribed: ${channel}`);
        });
      }
      debug(`not subscribed: ${channel}`);

      throw new Error('Not subscribed');
    },

    /**
     * Closes the connection with the socket and clears the timeouts
     * @returns
     */
    close: () => {
      debug('closing');

      if (timeouts.reconnect) {
        debug('clearing reconnect timeout');
        clearTimeout(timeouts.reconnect);
      }

      setStatus('closed');

      socket.close();

      return Promise.resolve();
    },
  };
};

export default messageBus;
