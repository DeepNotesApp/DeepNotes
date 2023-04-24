import type {
  makePrivateProcedureStep1,
  makePrivateProcedureStep2,
} from 'deepnotes-app-server/src/websocket/groups/privacy/make-private';
import { createWebsocketRequest } from 'src/code/utils/websocket-requests';

import { processGroupKeyRotationValues } from '../key-rotation';

export async function makeGroupPrivate(input: { groupId: string }) {
  const { promise } = createWebsocketRequest({
    url: `${process.env.APP_SERVER_URL.replaceAll(
      'http',
      'ws',
    )}/groups.privacy.makePrivate`,

    steps: [step1, step2, step3],
  });

  async function step1(): Promise<
    typeof makePrivateProcedureStep1['_def']['_input_in']
  > {
    return {
      groupId: input.groupId,
    };
  }

  async function step2(
    input_: typeof makePrivateProcedureStep1['_def']['_output_out'],
  ): Promise<typeof makePrivateProcedureStep2['_def']['_input_in']> {
    return await processGroupKeyRotationValues({
      ...input_,

      groupId: input.groupId,

      groupIsPublic: false,
    });
  }

  async function step3(
    _input: typeof makePrivateProcedureStep2['_def']['_output_out'],
  ) {
    //
  }

  return promise;
}
