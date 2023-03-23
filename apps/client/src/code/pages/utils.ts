import { base64ToBytes, bytesToBase64 } from '@stdlib/base64';
import { createPublicKeyring } from '@stdlib/crypto';
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
    mainLogger().error(error);
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

export async function createNotifications({
  recipients,

  patientId,

  notifications,
}: {
  recipients: Record<string, { publicKeyring: string }>;

  patientId?: string;

  notifications: {
    agent?: object;
    target?: object;
    observers?: object;
  };
}) {
  const agentId = authStore().userId;

  const agentSymmetricKey = wrapSymmetricKey();
  const targetSymmetricKey = wrapSymmetricKey();
  const observersSymmetricKey = wrapSymmetricKey();

  return [
    // Agent

    ...[
      notifications.agent != null
        ? {
            recipients: {
              [agentId]: {
                encryptedSymmetricKey: bytesToBase64(
                  internals.keyPair.encrypt(
                    agentSymmetricKey.value,
                    internals.keyPair.publicKey,
                  ),
                ),
              },
            },

            encryptedContent: bytesToBase64(
              agentSymmetricKey.encrypt(
                pack({
                  ...notifications.agent,

                  recipientType: 'agent',
                }),
                {
                  padding: true,
                  associatedData: { context: 'UserNotificationContent' },
                },
              ),
            ),
          }
        : {},
    ],

    // Target

    ...(notifications.target != null &&
    patientId != null &&
    recipients[patientId] != null
      ? [
          {
            recipients: {
              [patientId]: {
                encryptedSymmetricKey: bytesToBase64(
                  internals.keyPair.encrypt(
                    targetSymmetricKey.value,
                    createPublicKeyring(
                      base64ToBytes(recipients[patientId].publicKeyring),
                    ),
                  ),
                ),
              },
            },

            encryptedContent: bytesToBase64(
              targetSymmetricKey.encrypt(
                pack({
                  ...notifications.target,

                  recipientType: 'target',
                }),
                {
                  padding: true,
                  associatedData: { context: 'UserNotificationContent' },
                },
              ),
            ),
          },
        ]
      : []),

    // Others

    ...(notifications.observers != null
      ? [
          {
            recipients: objFromEntries(
              objEntries(recipients)
                .filter(
                  ([recipientUserId]) =>
                    recipientUserId !== agentId &&
                    recipientUserId !== patientId,
                )
                .map(([recipientUserId, { publicKeyring }]) => [
                  recipientUserId,
                  {
                    encryptedSymmetricKey: bytesToBase64(
                      internals.keyPair.encrypt(
                        observersSymmetricKey.value,
                        createPublicKeyring(base64ToBytes(publicKeyring)),
                      ),
                    ),
                  },
                ]),
            ),

            encryptedContent: bytesToBase64(
              observersSymmetricKey.encrypt(
                pack({
                  ...notifications.observers,

                  recipientType: 'observer',
                }),
                {
                  padding: true,
                  associatedData: { context: 'UserNotificationContent' },
                },
              ),
            ),
          },
        ]
      : []),
  ];
}

export async function requestWithNotifications(params: {
  url: string;

  body?: object;

  patientId?: string;

  notifications: {
    agent?: object;
    target?: object;
    observers?: object;
  };
}) {
  const notificationRecipients = (
    await api().post<{
      notificationRecipients: Record<string, { publicKeyring: string }>;
    }>(params.url, { ...params.body })
  ).data.notificationRecipients;

  await api().post(params.url, {
    ...params.body,

    notifications: await createNotifications({
      recipients: notificationRecipients,

      patientId: params.patientId,

      notifications: params.notifications,
    }),
  });
}
