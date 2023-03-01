import 'ws';

declare module 'ws' {
  interface WebSocket {
    aux: SocketAuxObject;
  }
}
