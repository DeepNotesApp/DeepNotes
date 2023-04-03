import { hashFNV1a } from '@stdlib/misc';
import Color from 'color';
import { cloneDeep, isArray, mergeWith } from 'lodash';
import { nanoid } from 'nanoid';
import {
  adjectives,
  animals,
  uniqueNamesGenerator,
} from 'unique-names-generator';
import type { WatchStopHandle } from 'vue';
import * as awarenessProtocol from 'y-protocols/awareness';

import { groupMemberNames } from '../../computed/group-member-names';
import type { Page } from '../page';
import type { PageCollab } from './collab';

export interface IAwarenessChanges {
  added: number[];
  updated: number[];
  removed: number[];
}

const oldSetLocalState = awarenessProtocol.Awareness.prototype.setLocalState;

awarenessProtocol.Awareness.prototype.setLocalState = function (state) {
  (this as any).localStateBackup = cloneDeep(state);

  oldSetLocalState.call(this, state);
};

export interface PresenceState {
  user: {
    id: string;
    name?: string;
    color?: string;
  };

  selection: Record<string, boolean>;
}

export class PagePresence {
  readonly page: Page;
  readonly collab: PageCollab;

  readonly awareness;

  unwatchUserName?: WatchStopHandle;

  readonly react = reactive({
    clientStates: new Map<number, PresenceState>(),

    userStates: computed(() => {
      const userStates = new Map<string, PresenceState>();

      for (const state of this.react.clientStates.values()) {
        userStates.set(state.user.id, state);
      }

      return userStates;
    }),
  });

  constructor({ collab }: { collab: PageCollab }) {
    this.page = collab.page;
    this.collab = collab;

    this.awareness = new awarenessProtocol.Awareness(this.collab.doc);
    (this.awareness as any).localStateBackup = null;

    this.awareness.on(
      'update',
      ({ added, updated, removed }: IAwarenessChanges) => {
        for (const clientID of added.concat(updated)) {
          this.react.clientStates.set(
            clientID,
            cloneDeep(this.awareness.getStates().get(clientID)) as any,
          );
        }

        for (const clientID of removed) {
          this.react.clientStates.delete(clientID);
        }
      },
    );

    this.mergeLocalState({
      user: {},

      selection: {},
    });
  }

  setup() {
    this.unwatchUserName = watchEffect(() => {
      const groupIsPublic = internals.realtime.globalCtx.hget(
        'group',
        this.collab.page.react.groupId,
        'is-public',
      );

      if (groupIsPublic !== false) {
        this.mergeLocalState({
          user: {
            id: nanoid(),

            name: uniqueNamesGenerator({
              dictionaries: [adjectives, animals],
              style: 'capital',
              separator: ' ',
            }),

            color: Color(`hsl(${Math.random() * 360}, 100%, 45%)`).hex(),
          },
        });
      } else {
        const groupMemberName = groupMemberNames()(
          `${this.page.react.groupId}:${authStore().userId}`,
        ).get();

        this.mergeLocalState({
          user: {
            id: authStore().userId,

            name:
              groupMemberName.status === 'success' ? groupMemberName.text : '?',

            color: Color(
              `hsl(${hashFNV1a(authStore().userId) % 360}, 100%, 35%)`,
            ).hex(),
          },
        });
      }
    });
  }

  destroy() {
    this.unwatchUserName?.();
  }

  mergeLocalState(obj: object) {
    if (this.awareness.states.get(this.awareness.doc.clientID) != null) {
      this.awareness.setLocalState(
        mergeWith(this.awareness.getLocalState(), obj, (_value, srcValue) => {
          if (isArray(srcValue)) {
            return srcValue;
          } else {
            return undefined;
          }
        }),
      );
    } else {
      (this.awareness as any).localStateBackup = mergeWith(
        (this.awareness as any).localStateBackup,
        obj,
        (_value, srcValue) => {
          if (isArray(srcValue)) {
            return srcValue;
          } else {
            return undefined;
          }
        },
      );
    }
  }
}
