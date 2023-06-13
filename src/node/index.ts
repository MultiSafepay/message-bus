import WebSocket from 'ws';
import wrapper from '../index.js';
import { customOptions } from '../types/index.js';

/**
 * Initializes the socket connected to the specified endpoint.
 * Allows you to define custom options. Token option is required.
 * @param endpoint 
 * @param customOptions 
 * @returns 
 */
const messageBus = (endpoint: string, customOptions: customOptions) => wrapper(WebSocket, endpoint, customOptions);

export default messageBus;
