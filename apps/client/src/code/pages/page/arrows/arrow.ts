import { lightenByRatio } from '@stdlib/color';
import type { Rect } from '@stdlib/misc';
import { getClosestPathPointPercent, listenPointerEvents } from '@stdlib/misc';
import { Line } from '@stdlib/misc';
import { Vec2 } from '@stdlib/misc';
import { getLineRectIntersection } from '@stdlib/misc';
import { Y } from '@syncedstore/core';
import type { Editor } from '@tiptap/vue-3';
import Color from 'color';
import { once } from 'lodash';
import type { ComputedRef, ShallowRef, UnwrapNestedRefs } from 'vue';
import { z } from 'zod';

import { colorNameToColorHex } from '../../colors';
import type { IElemReact } from '../elems/elem';
import { IElemCollab, PageElem } from '../elems/elem';
import { roundTimeToMinutes } from '../notes/date';
import type { PageNote } from '../notes/note';
import type { Page } from '../page';
import type { PageRegion } from '../regions/region';

export const IArrowCollab = once(() =>
  IElemCollab().extend({
    source: z.string().default(''),
    target: z.string().default(''),

    sourceAnchor: z
      .object({
        x: z.number(),
        y: z.number(),
      })
      .nullable()
      .default(null),
    targetAnchor: z
      .object({
        x: z.number(),
        y: z.number(),
      })
      .nullable()
      .default(null),

    sourceHead: z.string().default('none'),
    targetHead: z.string().default('open'),

    bodyType: z.string().default('curve'),
    bodyStyle: z.string().default('solid'),

    label: z.any().default(() => {
      const fragment = new Y.XmlFragment();

      const paragraph = new Y.XmlElement('paragraph');

      paragraph.insert(0, [new Y.XmlText('')]);

      fragment.insert(0, [paragraph]);

      return fragment;
    }) as z.ZodType<Y.XmlFragment>,

    color: z.string().default('grey'),

    readOnly: z.boolean().default(false),

    createdAt: z.number().default(() => roundTimeToMinutes(Date.now())),
    editedAt: z.number().default(() => roundTimeToMinutes(Date.now())),
  }),
);
export type IArrowCollabInput = z.input<ReturnType<typeof IArrowCollab>>;
export type IArrowCollabOutput = z.output<ReturnType<typeof IArrowCollab>>;

export const IArrowCollabDefault = once(() => IArrowCollab().parse({}));

export interface IArrowReact extends IElemReact {
  collab: ComputedRef<IArrowCollabOutput>;

  fakePos?: Vec2;
  looseEndpoint?: 'source' | 'target';

  interregional: ComputedRef<boolean>;

  valid: ComputedRef<boolean>;

  sourceNote: ComputedRef<PageNote>;
  targetNote: ComputedRef<PageNote>;

  sourcePos: ComputedRef<Vec2>;
  targetPos: ComputedRef<Vec2>;

  halfSizes: ComputedRef<{ source: Vec2; target: Vec2 }>;
  normals: ComputedRef<{ source: Vec2; target: Vec2 }>;

  sourceHeadPos: ComputedRef<Vec2>;
  targetHeadPos: ComputedRef<Vec2>;

  centerPos: Vec2;

  sourceAngle: ComputedRef<number>;
  targetAngle: ComputedRef<number>;

  color: {
    base: ComputedRef<string>;
    light: ComputedRef<string>;
    highlight: ComputedRef<string>;
    final: ComputedRef<string>;
  };

  editor: ShallowRef<Editor | null>;
  editors: ComputedRef<Editor[]>;

  loaded: boolean;
}

const _coordArray = ['x', 'y'] as const;

export const ARROW_WIDTH = 20;

export const ARROW_OFFSET = 4;

export const PageArrow = once(
  () =>
    class PageArrow extends PageElem() {
      readonly type = 'arrow';

      declare readonly react: UnwrapNestedRefs<IArrowReact>;

      constructor(args: {
        page: Page;
        id: string;
        index: number;
        collab?: IArrowCollabOutput;
      }) {
        super(args);

        const react: Omit<IArrowReact, keyof IElemReact> = {
          interregional: computed(() => {
            if (!this.react.valid) {
              return false;
            }

            if (this.react.fakePos != null) {
              return true;
            }

            if (
              this.react.sourceNote.react.dragging ||
              this.react.targetNote.react.dragging
            ) {
              return true;
            }

            return (
              this.react.sourceNote.react.region !==
              this.react.targetNote.react.region
            );
          }),

          valid: computed(() => {
            if (this.react.collab == null) {
              return false;
            }

            if (this.react.fakePos != null) {
              if (this.react.looseEndpoint === 'source') {
                return this.react.targetNote != null;
              } else if (this.react.looseEndpoint === 'target') {
                return this.react.sourceNote != null;
              }
            }

            if (
              this.react.sourceNote == null ||
              this.react.targetNote == null
            ) {
              return false;
            }

            if (
              !this.react.sourceNote.react.loaded ||
              !this.react.targetNote.react.loaded
            ) {
              return false;
            }

            if (
              !this.react.sourceNote.react.visible ||
              !this.react.targetNote.react.visible
            ) {
              return false;
            }

            if (this.react.sourceNote === this.react.targetNote) {
              return false;
            }

            if (
              this.react.region !== this.react.sourceNote.react.region &&
              this.react.region !== this.react.targetNote.react.region
            ) {
              return false;
            }

            if (
              this.react.sourceNote.react.islandRoot !==
              this.react.targetNote.react.islandRoot
            ) {
              return false;
            }

            return true;
          }),

          sourceNote: computed(
            () => this.page.notes.react.map[this.react.collab.source as string],
          ),
          targetNote: computed(
            () => this.page.notes.react.map[this.react.collab.target as string],
          ),

          sourcePos: computed(() => {
            if (this.react.fakePos != null) {
              if (
                this.react.looseEndpoint === 'source' &&
                this.react.sourceNote == null
              ) {
                return this.react.fakePos;
              } else {
                return this.react.sourceNote.react.islandRect.center;
              }
            }

            if (
              this.react.sourceNote.react.region ===
              this.react.targetNote.react.region
            ) {
              return this.react.sourceNote.react.relativeRect.center;
            } else {
              return this.react.sourceNote.react.islandRect.center;
            }
          }),
          targetPos: computed(() => {
            if (this.react.fakePos != null) {
              if (
                this.react.looseEndpoint === 'target' &&
                this.react.targetNote == null
              ) {
                return this.react.fakePos;
              } else {
                return this.react.targetNote.react.islandRect.center;
              }
            }

            if (
              this.react.sourceNote.react.region ===
              this.react.targetNote.react.region
            ) {
              return this.react.targetNote.react.relativeRect.center;
            } else {
              return this.react.targetNote.react.islandRect.center;
            }
          }),

          halfSizes: computed(() => {
            const sourceSize =
              this.react.fakePos != null &&
              this.react.looseEndpoint === 'source' &&
              this.react.sourceNote == null
                ? new Vec2(1)
                : this.react.sourceNote.react.relativeRect.halfSize ??
                  new Vec2(1);

            const targetSize =
              this.react.fakePos != null &&
              this.react.looseEndpoint === 'target' &&
              this.react.targetNote == null
                ? new Vec2(1)
                : this.react.targetNote.react.relativeRect.halfSize ??
                  new Vec2(1);

            return { source: sourceSize, target: targetSize };
          }),

          normals: computed(() => {
            const direction = this.react.targetPos
              .sub(this.react.sourcePos)
              .sign();

            const options: { source: Vec2; target: Vec2 }[] = [];

            for (
              let i = 0;
              i < (this.react.collab.sourceAnchor != null ? 1 : 2);
              i++
            ) {
              for (
                let j = 0;
                j < (this.react.collab.targetAnchor != null ? 1 : 2);
                j++
              ) {
                const sourceNormal = new Vec2(
                  this.react.collab.sourceAnchor ?? {
                    x: 0,
                    y: 0,
                    [_coordArray[i]]: direction[_coordArray[i]],
                  },
                );
                const targetNormal = new Vec2(
                  this.react.collab.targetAnchor ?? {
                    x: 0,
                    y: 0,
                    [_coordArray[j]]: direction[_coordArray[j]] * -1,
                  },
                );

                options.push({ source: sourceNormal, target: targetNormal });
              }
            }

            // Find the option with the smallest distance

            let minDistance = Infinity;
            let minOption = options[0];

            for (const option of options) {
              const sourcePos = this.react.sourcePos.add(
                option.source.mul(this.react.halfSizes.source),
              );
              const targetPos = this.react.targetPos.add(
                option.target.mul(this.react.halfSizes.target),
              );

              const distance = sourcePos.distSqr(targetPos);

              if (distance < minDistance) {
                minDistance = distance;
                minOption = option;
              }
            }

            return minOption;
          }),

          sourceHeadPos: computed(() => {
            if (this.react.collab.bodyType === 'line') {
              return (
                getLineRectIntersection(
                  new Line(this.react.targetPos, this.react.sourcePos),
                  (this.react.interregional
                    ? this.react.sourceNote.react.islandRect
                    : this.react.sourceNote.react.relativeRect
                  ).grow(new Vec2(ARROW_OFFSET)),
                ) ?? this.react.sourcePos
              );
            } else {
              return this.react.sourcePos.add(
                this.react.halfSizes.source
                  .mul(
                    this.react.collab.sourceAnchor != null
                      ? new Vec2(this.react.collab.sourceAnchor)
                      : this.react.normals.source,
                  )
                  .grow(new Vec2(ARROW_OFFSET)),
              );
            }
          }),
          targetHeadPos: computed(() => {
            if (this.react.collab.bodyType === 'line') {
              return (
                getLineRectIntersection(
                  new Line(this.react.sourcePos, this.react.targetPos),
                  (this.react.interregional
                    ? this.react.targetNote.react.islandRect
                    : this.react.targetNote.react.relativeRect
                  ).grow(new Vec2(ARROW_OFFSET)),
                ) ?? this.react.targetPos
              );
            } else {
              return this.react.targetPos.add(
                this.react.halfSizes.target
                  .mul(
                    this.react.collab.targetAnchor != null
                      ? new Vec2(this.react.collab.targetAnchor)
                      : this.react.normals.target,
                  )
                  .grow(new Vec2(ARROW_OFFSET)),
              );
            }
          }),

          centerPos: new Vec2(),

          sourceAngle: computed(() => {
            if (this.react.collab.bodyType === 'line') {
              return this.react.targetAngle + Math.PI;
            } else {
              return this.react.normals.source.angle() + Math.PI;
            }
          }),
          targetAngle: computed(() => {
            if (this.react.collab.bodyType === 'line') {
              return this.react.targetHeadPos
                .sub(this.react.sourceHeadPos)
                .angle();
            } else {
              return this.react.normals.target.angle() + Math.PI;
            }
          }),

          color: {
            base: computed(() =>
              colorNameToColorHex('arrows', this.react.collab.color as any),
            ),
            light: computed(() =>
              lightenByRatio(new Color(this.react.color.base), 0.3).hex(),
            ),
            highlight: computed(() =>
              lightenByRatio(new Color(this.react.color.base), 0.6).hex(),
            ),
            final: computed(() => {
              if (this.react.active) {
                return this.react.color.highlight;
              } else if (this.react.selected) {
                return this.react.color.light;
              } else {
                return this.react.color.base;
              }
            }),
          },

          editor: shallowRef(null),
          editors: computed(() =>
            this.react.editor ? [this.react.editor] : [],
          ),

          loaded: false,
        };

        Object.assign(this.react, react);

        setTimeout(() => {
          setTimeout(() => {
            this.react.loaded = true;

            mainLogger.info(`Arrow loaded (${this.id})`);
          });
        });
      }

      removeFromRegion() {
        const items = this.react.region.react.collab.arrowIds.slice();

        for (let i = items.length - 1; i >= 0; --i) {
          if (items[i] === this.id) {
            this.react.region.react.collab.arrowIds.splice(i, 1);
          }
        }
      }
      moveToRegion(region: PageRegion) {
        this.page.collab.doc.transact(() => {
          this.removeFromRegion();

          this.react.collab.regionId = region.id;

          region.react.collab.arrowIds.push(this.id);

          this.react.loaded = false;

          setTimeout(() => {
            setTimeout(() => {
              this.react.loaded = true;
            });
          });
        });
      }

      delete() {
        this.page.collab.doc.transact(() => {
          this.removeFromRegion();

          if (this.page.collab.store.arrows[this.id] != null) {
            delete this.page.collab.store.arrows[this.id];
          }
        });
      }

      getHitboxElem(): SVGPathElement | null {
        return document.querySelector(`#arrow-${this.id} > .arrow-hitbox`);
      }

      getClientRect() {
        const elem = this.getHitboxElem();

        if (elem == null) {
          return;
        }

        return this.page.rects.fromDOM(elem.getBoundingClientRect());
      }
      getWorldRect() {
        const clientRect = this.getClientRect();

        if (clientRect == null) {
          return;
        }

        return this.page.rects.clientToWorld(clientRect);
      }

      checkIntersection(rect: Rect) {
        const elem = this.getHitboxElem();

        return (
          elem?.ownerSVGElement?.checkIntersection(
            elem,
            new DOMRectReadOnly(
              rect.topLeft.x,
              rect.topLeft.y,
              rect.size.x,
              rect.size.y,
            ),
          ) ?? false
        );
      }

      grab(event: PointerEvent) {
        this.page.clickSelection.perform(this, event);

        const path = document.querySelector(
          `#arrow-${this.id} .arrow`,
        ) as SVGPathElement;

        if (path == null) {
          return;
        }

        const absoluteWorldPos = this.page.pos.clientToWorld(
          new Vec2(event.clientX, event.clientY),
        );

        const originWorldPos = this.react.interregional
          ? this.react.region.react.islandRoot.getOriginWorldPos()
          : this.react.region.getOriginWorldPos();

        if (originWorldPos == null) {
          return;
        }

        const relativeWorldPos = absoluteWorldPos.sub(originWorldPos);

        if (getClosestPathPointPercent(path, relativeWorldPos) < 0.5) {
          listenPointerEvents(event, {
            dragStartDistance: 5,

            dragStart: () => {
              this.page.arrowCreation.start({
                anchorNote: this.react.targetNote,
                looseEndpoint: 'source',
                baseArrow: this,
                event,
              });

              this.delete();
            },
          });
        } else {
          listenPointerEvents(event, {
            dragStartDistance: 5,

            dragStart: () => {
              this.page.arrowCreation.start({
                anchorNote: this.react.sourceNote,
                looseEndpoint: 'target',
                baseArrow: this,
                event,
              });

              this.delete();
            },
          });
        }
      }
    },
);
export type PageArrow = InstanceType<ReturnType<typeof PageArrow>>;
