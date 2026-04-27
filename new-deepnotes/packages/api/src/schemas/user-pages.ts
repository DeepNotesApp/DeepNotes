import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

import { byteB64 } from "./sessions.js";
import { nanoidIdOpenapi } from "./pages-groups.js";

extendZodWithOpenApi(z);

const nanoid21 = z
  .string()
  .regex(/^[A-Za-z0-9_-]{21}$/)
  .openapi(nanoidIdOpenapi);

export const userPagesPathQuerySchema = z.object({
  initialPageId: nanoid21.openapi({
    description: "Page to resolve toward the personal group main page.",
    param: { name: "initialPageId", in: "query" },
  }),
});

export const userStartingPageResponseSchema = z
  .object({
    startingPageId: z.string(),
  })
  .openapi("UserStartingPageResponse");

export const userCurrentPathResponseSchema = z
  .object({
    pathPageIds: z.array(z.string()),
  })
  .openapi("UserCurrentPathResponse");

export const userPageIdsBodySchema = z
  .object({
    pageIds: z.array(nanoid21).min(1),
  })
  .openapi("UserPageIdsBody");

export const userDefaultNotePatchSchema = z
  .object({
    userEncryptedDefaultNote: byteB64,
  })
  .openapi("UserDefaultNotePatch");

export const userDefaultArrowPatchSchema = z
  .object({
    userEncryptedDefaultArrow: byteB64,
  })
  .openapi("UserDefaultArrowPatch");

export const userNotificationsQuerySchema = z.object({
  lastNotificationId: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .openapi({
      description:
        "Return notifications strictly older than this id (legacy pagination).",
      param: { name: "lastNotificationId", in: "query" },
    }),
});

export const userNotificationItemSchema = z
  .object({
    id: z.number().int(),
    type: z.string(),
    encryptedSymmetricKey: byteB64,
    encryptedContent: byteB64,
    dateTime: z.string(),
  })
  .openapi("UserNotificationItem");

export const userNotificationsLoadResponseSchema = z
  .object({
    items: z.array(userNotificationItemSchema),
    hasMore: z.boolean(),
    lastNotificationRead: z.number().int().nullable().optional(),
  })
  .openapi("UserNotificationsLoadResponse");
