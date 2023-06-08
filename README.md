<p align="center">
    <img src="https://camo.githubusercontent.com/517483ae0eaba9884f397e9af1c4adc7bbc231575ac66cc54292e00400edcd10/68747470733a2f2f7777772e6d756c7469736166657061792e636f6d2f66696c6561646d696e2f74656d706c6174652f696d672f6d756c7469736166657061792d6c6f676f2d69636f6e2e737667" width="400px" position="center">
</p>

# Node.js wrapper for the MultiSafepay API

This wrapper simplifies working with the MultiSafepay API and lets you listen to the events received from your Payment Terminals.

## About MultiSafepay

MultiSafepay is a Dutch payment service provider, which takes care of contracts, processing transactions, and collecting payment for a range of local and international payment methods. Start selling online today and manage all your transactions in one place!

## Requirements

- You will need a MultiSafepay account. Consider [creating a test account](https://testmerchant.multisafepay.com/signup) first.
- If using Node 8.0+, we recommend using async/await. For older versions of Node, use promises or callbacks instead of async/await.

## Installation

With npm:

```sh
npm install multisafepay/message-bus --save
```

And yarn:

```sh
yarn add multisafepay/message-bus
```

## Usage

Set up the client for testing with **ES6 imports**:

```javascript
import connect from 'multisafepay/message-bus';
const messageBus = connect('events_url', { token: events_token });
```

With **require module**:

```javascript
const connect = require('multisafepay/message-bus').default;
const messageBus = connect('events_url', { token: events_token });
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