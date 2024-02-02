import { addDays, isNanoID } from '@stdlib/misc';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { TRPCError } from '@trpc/server';
import { once } from 'lodash';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
import { z } from 'zod';

const baseProcedure = authProcedure.input(
  z.object({
    pageId: z.string().refine(isNanoID),
  }),
);

export const deletePermanentlyProcedure = once(() =>
  baseProcedure.mutation(deletePermanently),
);

export async function deletePermanently({
  ctx,
  input,
}: InferProcedureOpts<typeof baseProcedure>) {
  return await ctx.usingLocks(
    [[`user-lock:${ctx.userId}`], [`page-lock:${input.pageId}`]],
    async (signals) => {
      const groupId = await ctx.dataAbstraction.hget(
        'page',
        input.pageId,
        'group-id',
      );

      return await ctx.usingLocks(
        [[`group-lock:${groupId}`]],
        async (signals) => {
          return await ctx.dataAbstraction.transaction(async (dtrx) => {
            // Check permissions

            await ctx.assertSufficientGroupPermissions({
              userId: ctx.userId,
              groupId: groupId,
              permission: 'editGroupPages',
            });

            // Check if page is permanently deleted

            const permanentlyDeletionDate = await ctx.dataAbstraction.hget(
              'page',
              input.pageId,
              'permanent-deletion-date',
            );

            if (
              permanentlyDeletionDate != null &&
              permanentlyDeletionDate < new Date()
            ) {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'Page is already permanently deleted.',
              });
            }

            // Check if page is main page

            const mainPageId = await ctx.dataAbstraction.hget(
              'group',
              groupId,
              'main-page-id',
            );

            if (input.pageId === mainPageId) {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message:
                  "Cannot delete a group's main page, either replace the main page first or delete the whole group.",
              });
            }

            // Check if page is free

            let numFreePages;

            const pageIsFree = await ctx.dataAbstraction.hget(
              'page',
              input.pageId,
              'free',
            );

            if (pageIsFree) {
              numFreePages = await ctx.dataAbstraction.hget(
                'user',
                ctx.userId,
                'num-free-pages',
              );
            }

            // Delete page permanently

            await Promise.all([
              ctx.dataAbstraction.patch(
                'page',
                input.pageId,
                { permanent_deletion_date: addDays(new Date(), -1) },
                { dtrx },
              ),

              ...(pageIsFree
                ? [
                    ctx.dataAbstraction.patch(
                      'user',
                      ctx.userId,
                      { num_free_pages: numFreePages + 1 },
                      { dtrx },
                    ),
                  ]
                : []),
            ]);

            checkRedlockSignalAborted(signals);
          });
        },
        signals,
      );
    },
  );
}
