import wrapper from '../index.js';

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
const messageBus = (endpoint, customOptions) => wrapper(WebSocket, endpoint, customOptions);

export default messageBus;
