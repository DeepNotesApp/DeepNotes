import type { IVec2 } from './vec2';
import { Vec2 } from './vec2';

export interface IRect {
  topLeft: IVec2;
  bottomRight: IVec2;
}

export class Rect {
  topLeft: Vec2;
  bottomRight: Vec2;

  constructor(topLeft?: Vec2 | IRect, bottomRight?: Vec2) {
    if (topLeft instanceof Vec2) {
      this.topLeft = new Vec2(topLeft);
      this.bottomRight = new Vec2(bottomRight ?? topLeft);
    } else {
      this.topLeft = new Vec2(topLeft?.topLeft);
      this.bottomRight = new Vec2(topLeft?.bottomRight);
    }
  }

  get size(): Vec2 {
    return this.bottomRight.sub(this.topLeft);
  }
  set size(value: Vec2) {
    this.bottomRight = this.topLeft.add(value);
  }

  get halfSize(): Vec2 {
    return this.size.divScalar(2);
  }
  set halfSize(value: Vec2) {
    this.size = value.mulScalar(2);
  }

  get center(): Vec2 {
    return this.topLeft.lerp(this.bottomRight, 0.5);
  }

  grow(amount: Vec2) {
    return new Rect(this.topLeft.sub(amount), this.bottomRight.add(amount));
  }

  inside(rect: Rect) {
    return (
      this.topLeft.x >= rect.topLeft.x &&
      this.topLeft.y >= rect.topLeft.y &&
      this.bottomRight.x <= rect.bottomRight.x &&
      this.bottomRight.y <= rect.bottomRight.y
    );
  }

  intersectsRect(rect: Rect) {
    return (
      this.topLeft.x <= rect.bottomRight.x &&
      this.topLeft.y <= rect.bottomRight.y &&
      this.bottomRight.x >= rect.topLeft.x &&
      this.bottomRight.y >= rect.topLeft.y
    );
  }
  containsRect(rect: Rect) {
    return (
      rect.topLeft.x >= this.topLeft.x &&
      rect.topLeft.y >= this.topLeft.y &&
      rect.bottomRight.x <= this.bottomRight.x &&
      rect.bottomRight.y <= this.bottomRight.y
    );
  }
  containsVec2(pos: Vec2) {
    return (
      pos.x >= this.topLeft.x &&
      pos.y >= this.topLeft.y &&
      pos.x <= this.bottomRight.x &&
      pos.y <= this.bottomRight.y
    );
  }
}
