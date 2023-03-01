import { Model } from 'objection';

export async function patchMultiple(
  table: string,
  columns: string[],
  types: string[],
  values: any[][],
  where: string,
  set: string,
  params?: { trx: any },
) {
  if (values.length === 0) {
    return;
  }

  let query = Model.knex().raw(
    `
      UPDATE
        ${table}
      SET
        ${set}
      FROM (
        VALUES
          ${values
            .map((row) => `(${row.map((_, i) => `?::${types[i]}`).join(', ')})`)
            .join(', ')}
      ) AS values (${columns.join(', ')})
      WHERE
        ${where}
    `,

    [...values.flat()],
  );

  if (params?.trx) {
    query = query.transacting(params.trx);
  }

  return await query;
}
