import { listenPointerEvents } from '@stdlib/misc';
import { Vec2 } from '@stdlib/misc';

import type { Page } from '../page';

export class PagePanning {
  readonly page: Page;

  currentPos: Vec2 = new Vec2();

  readonly react = reactive({
    active: false,
  });

  cancelPointerEvents?: () => void;

  constructor({ page }: { page: Page }) {
    this.page = page;
  }

  start(event: PointerEvent) {
    this.currentPos = this.page.pos.eventToClient(event);

    this.cancelPointerEvents = listenPointerEvents(event, {
      move: this._update,
      up: this._finish,
    });
  }

  private _update = (event: PointerEvent) => {
    this.react.active = true;

    const clientPos = this.page.pos.eventToClient(event);

    this.page.camera.react.pos = this.page.camera.react.pos.sub(
      clientPos.sub(this.currentPos).divScalar(this.page.camera.react.zoom),
    );

    this.currentPos = clientPos;

    this.page.fixDisplay();
  };

  private _finish = () => {
    // setTimeout necessary to prevent middle-click link opening

    setTimeout(() => {
      this.react.active = false;
    });
  };

  cancel = () => {
    this.cancelPointerEvents?.();

    this._finish();
  };
}
