import { createKeyring } from '@stdlib/crypto';
import { wrapSymmetricKey } from '@stdlib/crypto';
import { objEntries, objFromEntries } from '@stdlib/misc';
import syncedStore, { getYjsDoc, Y } from '@syncedstore/core';
import { pack } from 'msgpackr';
import { z } from 'zod';

import { pageAbsoluteTitles } from './computed/page-absolute-titles';
import { pageRelativeTitles } from './computed/page-relative-titles';
import type { IAppCollabStore } from './page/collab/collab';

export const IVec2 = (x?: number, y?: number) =>
  z.object({
    x: z.number().default(x ?? 0),
    y: z.number().default(y ?? 0),
  });

export function createPageStore() {
  return syncedStore({
    page: {},
    notes: {},
    arrows: {},
  }) as IAppCollabStore;
}
export function createPageDoc() {
  return getYjsDoc(createPageStore());
}

export function applyDocUpdate(doc: Y.Doc, update: Uint8Array, origin?: any) {
  try {
    Y.applyUpdateV2(doc, update, origin);
  } catch (error) {
    mainLogger.error(error);
  }
}

export function revertToSnapshot(doc: Y.Doc, snapshotUpdate: Uint8Array) {
  const auxDoc = createPageDoc();

  applyDocUpdate(auxDoc, snapshotUpdate);

  const currentStateVector = Y.encodeStateVector(doc);

  const snapshotStateVector = Y.encodeStateVector(auxDoc);
  const forwardUpdate = Y.encodeStateAsUpdateV2(doc, snapshotStateVector);

  const undoManager = new Y.UndoManager(
    [auxDoc.getMap('page'), auxDoc.getMap('notes'), auxDoc.getMap('arrows')],
    { trackedOrigins: new Set([null]) },
  );

  applyDocUpdate(auxDoc, forwardUpdate, null);

  undoManager.undo();

  const backwardUpdate = Y.encodeStateAsUpdateV2(auxDoc, currentStateVector);

  applyDocUpdate(doc, backwardUpdate, null);
}

export function getPageTitle(
  pageId: string,
  params: { prefer: 'relative' | 'absolute' },
) {
  const pageRelativeTitle = pageRelativeTitles()(pageId).get();
  const pageAbsoluteTitle = pageAbsoluteTitles()(pageId).get();

  if (params.prefer === 'relative') {
    if (pageRelativeTitle.status === 'success' && pageRelativeTitle.text) {
      return pageRelativeTitle;
    }

    return pageAbsoluteTitle;
  } else {
    if (pageAbsoluteTitle.status === 'success' && pageAbsoluteTitle.text) {
      return pageAbsoluteTitle;
    }

    return pageRelativeTitle;
  }
}

export async function createNotifications(input: {
  recipients: Record<string, { publicKeyring: Uint8Array }>;

  patientId?: string;

  notifications: {
    agent?: object;
    target?: object;
    observers?: object;
  };
}): Promise<
  {
    recipients: Record<string, { encryptedSymmetricKey: Uint8Array }>;
    encryptedContent: Uint8Array;
  }[]
> {
  const agentId = authStore().userId;

  const agentSymmetricKey = wrapSymmetricKey();
  const targetSymmetricKey = wrapSymmetricKey();
  const observersSymmetricKey = wrapSymmetricKey();

  return [
    // Agent

    ...(input.notifications.agent != null
      ? [
          {
            recipients: {
              [agentId]: {
                encryptedSymmetricKey: internals.keyPair.encrypt(
                  agentSymmetricKey.value,
                  internals.keyPair.publicKey,
                ),
              },
            },

            encryptedContent: agentSymmetricKey.encrypt(
              pack({
                ...input.notifications.agent,

                recipientType: 'agent',
              }),
              {
                padding: true,
                associatedData: { context: 'UserNotificationContent' },
              },
            ),
          },
        ]
      : []),

    // Target

    ...(input.notifications.target != null &&
    input.patientId != null &&
    input.recipients[input.patientId] != null
      ? [
          {
            recipients: {
              [input.patientId]: {
                encryptedSymmetricKey: internals.keyPair.encrypt(
                  targetSymmetricKey.value,
                  createKeyring(
                    input.recipients[input.patientId].publicKeyring,
                  ),
                ),
              },
            },

            encryptedContent: targetSymmetricKey.encrypt(
              pack({
                ...input.notifications.target,

                recipientType: 'target',
              }),
              {
                padding: true,
                associatedData: { context: 'UserNotificationContent' },
              },
            ),
          },
        ]
      : []),

    // Others

    ...(input.notifications.observers != null
      ? [
          {
            recipients: objFromEntries(
              objEntries(input.recipients)
                .filter(
                  ([recipientUserId]) =>
                    recipientUserId !== agentId &&
                    recipientUserId !== input.patientId,
                )
                .map(([recipientUserId, { publicKeyring }]) => [
                  recipientUserId,
                  {
                    encryptedSymmetricKey: internals.keyPair.encrypt(
                      observersSymmetricKey.value,
                      createKeyring(publicKeyring),
                    ),
                  },
                ]),
            ),

            encryptedContent: observersSymmetricKey.encrypt(
              pack({
                ...input.notifications.observers,

                recipientType: 'observer',
              }),
              {
                padding: true,
                associatedData: { context: 'UserNotificationContent' },
              },
            ),
          },
        ]
      : []),
  ];
}
