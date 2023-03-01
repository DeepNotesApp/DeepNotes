export enum RealtimeClientMessageType {
  REQUEST,
}

export enum RealtimeServerMessageType {
  RESPONSE,
  DATA_NOTIFICATION,
  USER_NOTIFICATION,
}

export enum RealtimeCommandType {
  HGET,
  HSET,
  SUBSCRIBE,
  UNSUBSCRIBE,
}
