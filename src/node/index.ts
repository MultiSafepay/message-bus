import WebSocket from 'ws';
import wrapper from '../index.js';
import { MessageBus, customOptions } from '../types/index.js';

/**
 * Initializes the socket connected to the specified endpoint.
 * Allows you to define custom options. Token option is required.
 * @param endpoint 
 * @param customOptions 
 * @returns 
 */
export default ((endpoint: string, customOptions: customOptions) => wrapper(WebSocket, endpoint, customOptions)) as MessageBus;