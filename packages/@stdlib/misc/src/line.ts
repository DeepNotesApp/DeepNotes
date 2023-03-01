import type { Vec2 } from './vec2';

export class Line {
  start: Vec2;
  end: Vec2;

  constructor(start: Vec2, end: Vec2) {
    this.start = start;
    this.end = end;
  }
}
