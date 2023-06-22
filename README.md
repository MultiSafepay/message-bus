<p align="center">
    <img src="https://camo.githubusercontent.com/517483ae0eaba9884f397e9af1c4adc7bbc231575ac66cc54292e00400edcd10/68747470733a2f2f7777772e6d756c7469736166657061792e636f6d2f66696c6561646d696e2f74656d706c6174652f696d672f6d756c7469736166657061792d6c6f676f2d69636f6e2e737667" width="400px" position="center">
</p>

# Cross-platform WebSocket plugin for the MultiSafepay API

This plugin simplifies working with the MultiSafepay API and lets you listen to the events received from your Payment Terminals.

You can use this plugin in a Node.js backend or in any javascript frontend.

## About MultiSafepay

MultiSafepay is a Dutch payment service provider, which takes care of contracts, processing transactions, and collecting payment for a range of local and international payment methods. Start selling online today and manage all your transactions in one place!

## Installation

With npm:

```sh
npm install @multisafepay/message-bus --save
```

And yarn:

```sh
yarn add @multisafepay/message-bus
```

In case you want to use in plain HTML, you should have the code base of this plugin accesible, either at folder level or having the code deployed somewhere.

## Usage
In order to get everything you need for initializating the plugin, you will have to make a valid order request to our MultiSafepay API.
If you have any doubts on how to do this, [follow these instructions](https://docs.multisafepay.com/recipes/cloud-pos-payments)

Set up the client for testing with **ES6 imports**:

```javascript
import connect from '@multisafepay/message-bus';

const { events_url, events_token } = orderResponse.data;

const messageBus = connect(events_url, { token: events_token });
```

Set up the client for testing with **CommonJS imports**:

```javascript
const connect = require('@multisafepay/message-bus').default;

const { events_url, events_token } = orderResponse.data;

const messageBus = connect(events_url, { token: events_token });
```

With **script tag**:

```html
 <script type="module">
    import connect from `https://unpkg.com/@multisafepay/message-bus/dist/esm/browser/index.js`

    const { events_url, events_token } = orderResponse.data;

    const messageBus = connect(events_url, { token: events_token });
</script>
```


Subscribe to the order event:

```javascript
messageBus.subscribe('session.order', {}, (data) => {
    // Your actions with the payload
    console.log(data)
})
```

Unsubscribe to the order event:

```javascript
messageBus.unsubscribe('session.order')
```

Stop listening to events:

```javascript
messageBus.close()
```


## Support

Create an issue on this repository or email <a href="mailto:integrationt@multisafepay.com">integration@multisafepay.com</a>

## Contributions

Feel free to [create a pull request](https://github.com/MultiSafepay/message-bus) on this repository to suggest improvements.

## API reference

See MultiSafepay Docs – [API reference](https://docs.multisafepay.com/api/).

## License

[MIT License](https://github.com/MultiSafepay/message-bus/blob/master/LICENSE)
