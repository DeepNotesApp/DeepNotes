import 'http';

declare module 'http' {
  interface IncomingMessage {
    sessionId?: string;
  }
}
