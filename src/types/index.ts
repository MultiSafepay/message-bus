export type options = {
    debug: boolean,
    initialReconnectTimeout: number,
    reconnectTimeoutFactor: number,
    maxReconnectTimeout: number,
    keepAliveTimeout: number,
    token: string,
    nextId?: () => string
}

export type customOptions = {
    debug?: boolean,
    initialReconnectTimeout?: number,
    reconnectTimeoutFactor?: number,
    maxReconnectTimeout?: number,
    keepAliveTimeout?: number,
    token: string,
    nextId?: () => string
}

export type reconnect = {
    reconnect?: NodeJS.Timeout
}

export type subscription = {
    channel: string,
    callback: (payload: TransactionResponse) => void,
    filter?: object
}

export type pendingReplies = {
    [index: string]: [(value?: unknown) => void, (reason?: unknown) => void]
}

export type events = {
    [index: string]: () => void
}

export interface TransactionResponse {
    financial_status: PaymentStatus;
    order_id: string;
    session_id: string;
    status: PaymentStatus;
    transaction_id: number;
}

export type PaymentStatus = 'initialized' | 'completed' | 'cancelled' | 'void' | 'expired' | 'declined' | 'uncleared';