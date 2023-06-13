import { TransactionResponse, customOptions, events, options, pendingReplies, reconnect, subscription } from "./types/index.js";

const methodWrapper = (WebSocket: any, endpoint: string, customOptions: customOptions) => {
  const subscriptions: subscription[] = [];
  const pending: string[] = [];
  const pendingReplies: pendingReplies = {};
  const events: events = {};
  const timeouts: reconnect = {};
  let status = 'connecting';
  let socket: typeof WebSocket;
  let lastActivityTimestamp: number;
  let reconnectTimeout: number;

  const options: options = {
    debug: customOptions.debug || false,
    initialReconnectTimeout: customOptions.initialReconnectTimeout || 1000,
    reconnectTimeoutFactor: customOptions.reconnectTimeoutFactor || 2,
    maxReconnectTimeout: customOptions.maxReconnectTimeout || 60000,
    keepAliveTimeout: customOptions.keepAliveTimeout || 30000,
    token: customOptions.token,
    nextId: customOptions.nextId || undefined,
  };

  reconnectTimeout = options.initialReconnectTimeout!;

  const debug = (...args: any[]) => {
    if (options.debug && console) {
      console.log.apply(this, args);
    }
  }

  debug(options);

  function recordActivity() {
    lastActivityTimestamp = new Date().getTime();
  }

  function send(data: object) {
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

    const result: string[] = [];
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
          || new Date().getTime() - lastActivityTimestamp > options.keepAliveTimeout!
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

  function setStatus(newStatus: string) {
    debug(`status: ${newStatus}`);

    status = newStatus;

    if (events[status]) {
      events[status]();
    }
  }

  function connect() {
    debug(`connecting: ${endpoint}`);

    if (!endpoint) throw new Error('No endpoint to connect');

    let processedEndpoint: string;

    if (options.token) {
      if (/\?/.test(endpoint)) {
        processedEndpoint = `${endpoint}&token=${options.token}`;
      } else {
        processedEndpoint = `${endpoint}?token=${options.token}`;
      }
    } else {
      throw new Error("No token specified");
    }

    socket = new WebSocket(processedEndpoint);

    socket.onopen = () => {
      setStatus('connected');

      recordActivity();

      subscriptions.forEach((subscription) => {
        send({
          id: nextId(),
          type: 'subscribe',
          channel: subscription.channel,
          filter: subscription.filter,
        });

        debug(`resubscribed: ${subscription.channel}`);
      });

      while (pending.length) {
        socket.send(pending.shift());
      }
    };

    socket.onmessage = (event: MessageEvent) => {
      recordActivity();

      try {
        debug(`message received: ${event.data}`);

        const message = JSON.parse(event.data);

        if (message.type === 'event') {
          const subscription = subscriptions.find((subscription) =>
            subscription.channel === message.channel
          );

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
    };

    socket.onclose = (event: CloseEvent) => {
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
    };

    socket.onerror = () => {
      debug('websocket error');
    };
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
    on: (ev: string, callback: () => void) => {
      events[ev] = callback;
    },

    /**
     * Subscribes to the specified channel.
     * This allows you to specify a callback that will be executed when you receive a new message
     * @param channel 
     * @param filter 
     * @param callback 
     * @returns 
     */
    subscribe: async (channel: string, filter: any, callback: (payload: TransactionResponse) => void): Promise<void> => {
      if (subscriptions.find((subscription) => subscription.channel === channel)) {
        debug(`already subscribed: ${channel}`);

        throw new Error('Already subscribed');
      }
      const id = nextId();

      const data = {
        id,
        type: 'subscribe',
        channel,
        filter: filter ? filter : undefined
      };

      send(data);

      return new Promise((resolve, reject) => {
        pendingReplies[id] = [resolve, reject];
      }).then(() => {
        debug(`subscribed: ${channel}`);

        subscriptions.push({
          channel,
          callback,
          filter
        });
      });
    },

    /**
     * Unsuscribes from the specified channel
     * @param channel 
     * @returns 
     */
    unsubscribe: async (channel: string): Promise<void> => {
      const subscriptionIndex = subscriptions.findIndex((subscription) => subscription.channel === channel)
      if (subscriptionIndex !== -1) {
        const id = nextId();

        send({
          id,
          type: 'unsubscribe',
          channel,
        });

        return new Promise((resolve, reject) => {
          pendingReplies[id] = [resolve, reject];
        }).then(() => {
          subscriptions.splice(subscriptionIndex, 1);

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
    close: (): Promise<void> => {
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

export default methodWrapper;
