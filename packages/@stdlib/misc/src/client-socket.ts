import { once } from 'lodash';

import { mainLogger } from './logger';
import { Resolvable } from './resolvable';

const classLogger = mainLogger.sub('ClientSocket');

export const ClientSocket = once(
  () =>
    class {
      connectPromise?: Resolvable;

      socket?: WebSocket;

      #keepConnected = false;

      #nextReconnectDelay = 0;

      constructor(readonly url: string) {}

      connect() {
        if (this.socket != null) {
          return;
        }

        this.connectPromise ??= new Resolvable();

        this.#keepConnected = true;

        this.socket = new WebSocket(this.url);

        this.socket.binaryType = 'arraybuffer';

        this.socket.addEventListener('error', (event) => {
          if (this.socket !== event.target) {
            return;
          }

          console.error('Websocket error:', event);
        });

        this.socket.addEventListener('open', (event) => {
          if (this.socket !== event.target) {
            return;
          }

          classLogger.info('Websocket opened %o', event);

          this.#nextReconnectDelay = 500;

          this.connectPromise?.resolve();
          this.connectPromise = undefined;
        });

        this.socket.addEventListener('close', (event) => {
          if (this.socket !== event.target) {
            return;
          }

          classLogger.info('Websocket closed %o', event);

          this.socket = undefined;

          if (this.#keepConnected) {
            this.#nextReconnectDelay = Math.min(5000, this.#nextReconnectDelay);

            setTimeout(
              () => {
                this.#nextReconnectDelay *= 2;

                this.connect();
              },
              this.#nextReconnectDelay +
                this.#nextReconnectDelay * Math.random(),
            );
          }
        });
      }

      disconnect() {
        this.#keepConnected = false;

        this.connectPromise = undefined;

        if (this.socket?.readyState === WebSocket.OPEN) {
          this.socket?.close();
        }

        this.socket = undefined;
      }

      get connected() {
        return this.socket?.readyState === WebSocket.OPEN;
      }

      send(message: Uint8Array, callback?: () => void) {
        if (this.connected) {
          this.socket?.send(message);

          callback?.();
        } else {
          void this.connectPromise?.then(() => {
            this.socket?.send(message);

            callback?.();
          });
        }
      }
    },
);
