import { MessageBus, customOptions } from '../types/index.js';
import wrapper from '../index.js';

let ws: any = undefined;

if (typeof WebSocket !== 'undefined') {
  ws = WebSocket
} else if (typeof global !== 'undefined') {
  ws = global.WebSocket
} else if (typeof window !== 'undefined') {
  ws = window.WebSocket
} else if (typeof self !== 'undefined') {
  ws = self.WebSocket
}

/**
 * Initializes the socket connected to the specified endpoint.
 * Allows you to define custom options. Token option is required.
 * @param endpoint 
 * @param customOptions 
 * @returns 
 */
export default ((endpoint: string, customOptions: customOptions) => wrapper(ws, endpoint, customOptions)) as MessageBus;
