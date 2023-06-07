import WebSocket from "ws";

export default (endpoint, options) => {
    var subscriptions = {};
    var pending = [];
    var pendingReplies = {};
    var events = {};
    var socket;
    var status = "connecting";
    var lastActivityTimestamp;
    var reconnectTimeout;
    var timeouts = {};
  
    options = Object.assign(
      {
        debug: false,
        initialReconnectTimeout: 1000,
        reconnectTimeoutFactor: 2,
        maxReconnectTimeout: 60000,
        keepAliveTimeout: 30000,
        token: null,
      },
      options
    );
  
    reconnectTimeout = options.initialReconnectTimeout;
  
    debug(options);
  
    function recordActivity() {
      lastActivityTimestamp = new Date().getTime();
    }
  
    function heartbeat() {
      if (status == "connected") {
        if (
          !lastActivityTimestamp ||
          new Date().getTime() - lastActivityTimestamp > options.keepAliveTimeout
        ) {
          debug("heartbeat");
  
          send({ id: nextId(), type: "heartbeat" });
        }
      }
    }
  
    function setupHeartbeats() {
      debug("installing heartbeat");
  
      setInterval(function () {
        heartbeat();
      }, options.keepAliveTimeout);
    }
  
    function setStatus(newStatus) {
      debug("status: " + newStatus);
  
      status = newStatus;
  
      if (events[status]) {
        events[status]();
      }
    }
  
    function send(data) {
      data = JSON.stringify(data);
  
      if (status != "connected") {
        pending.push(data);
      } else {
        socket.send(data);
  
        recordActivity();
      }
  
      debug("message sent: " + data);
    }
  
    function debug() {
      if (options.debug && console) {
        console.log.apply(this, arguments);
      }
    }
  
    function connect() {
      debug("connecting: " + endpoint);
  
      if (options.token) {
        if (/\?/.test(endpoint)) {
          endpoint = endpoint + '&token=' + options.token;
        }
        else {
          endpoint = endpoint + '?token=' + options.token;
        }
      }
  
      socket = new WebSocket(endpoint);
  
      socket.on('open', () => {
        setStatus("connected");
  
        recordActivity();
  
        for (var channel in subscriptions) {
          send({
            id: nextId(),
            type: "subscribe",
            channel: channel,
            filter: subscriptions[channel].filter,
          });
  
          debug("resubscribed: " + channel);
        }
  
        var data;
        while ((data = pending.shift())) {
          socket.send(data);
        }
      });
  
      socket.on('message', (event) =>  {
        recordActivity();
  
        try {
          debug("message received: " + event.data);
  
          var message = JSON.parse(event.data);
  
          if (message.type == "event") {
            var subscription = subscriptions[message.channel];
  
            if (subscription) {
              subscription.callback(message.payload);
            }
          } else if (message.replyId && pendingReplies[message.replyId]) {
            debug("resolved pending reply: " + message.replyId);
  
            if (message.type == "ack") {
              pendingReplies[message.replyId][0]();
            } else {
              pendingReplies[message.replyId][1](message.payload.message);
            }
  
            delete pendingReplies[message.replyId];
          }
        } catch (e) {}
      });
  
      socket.on('close', (event) => {
        if (event && !event.wasClean && status != "closed") {
          setStatus("reconnecting");
  
          debug("reconnect timeout: ", reconnectTimeout);
  
          timeouts["reconnect"] = setTimeout(function () {
            connect();
          }, reconnectTimeout);
  
          if (reconnectTimeout < options.maxReconnectTimeout) {
            reconnectTimeout = reconnectTimeout * options.reconnectTimeoutFactor;
          } else {
            reconnectTimeout = options.initialReconnectTimeout;
          }
        }
      });
  
      socket.on('error', (error) => {
        debug("websocket error");
      });
    }
  
    function nextId() {
      if (options.nextId) return options.nextId();
  
      var result = [];
      var hexRef = [
        "0",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "a",
        "b",
        "c",
        "d",
        "e",
        "f",
      ];
  
      for (var n = 0; n < 16; n++) {
        result.push(hexRef[Math.floor(Math.random() * 16)]);
      }
      return result.join("");
    }
  
    setupHeartbeats();
  
    connect();
  
    var mb = {
      on: function (ev, callback) {
        events[ev] = callback;
      },
      subscribe: function (channel, filter, callback) {
        if (subscriptions[channel]) {
          debug("already subscribed: " + channel);
  
          return Promise.reject("Already subscribed");
        } else {
          let id = nextId();
  
          let data = {
            id: id,
            type: "subscribe",
            channel: channel
          };
  
          if (filter != null) {
            data.filter = filter;
          }
  
          send(data);
  
          return new Promise((resolve, reject) => {
            pendingReplies[id] = [resolve, reject];
          }).then(() => {
            debug("subscribed: " + channel);
  
            subscriptions[channel] = {};
            subscriptions[channel].callback = callback;
            subscriptions[channel].filter = filter;
          });
        }
      },
      unsubscribe: function (channel) {
        if (subscriptions[channel]) {
          var id = nextId();
  
          send({
            id: id,
            type: "unsubscribe",
            channel: channel,
          });
  
          return new Promise((resolve, reject) => {
            pendingReplies[id] = [resolve, reject];
          }).then(() => {
            delete subscriptions[channel];
  
            debug("unsubscribed: " + channel);
          });
        } else {
          debug("not subscribed: " + channel);
  
          return Promise.reject("Not subscribed");
        }
      },
      close: function () {
        debug("closing");
  
        if (timeouts["reconnect"]) {
          debug("clearing reconnect timeout");
          clearTimeout(timeouts["reconnect"]);
        }
  
        setStatus("closed");
  
        socket.close();
  
        return Promise.resolve();
      },
    };
  
    return Promise.resolve(mb);
  }