import { mainLogger } from '@stdlib/misc';
import type Fastify from 'fastify';
import jws from 'jws';
import { createContext } from 'src/trpc/context';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { publicProcedure } from 'src/trpc/helpers';
import { z } from 'zod';

interface responseBodyV2DecodedPayload {
  /* A unique identifier for the notification. Use this value to identify a duplicate notification. */

  notificationUUID: string;

  /*
    The in-app purchase event for which the App Store sends this version 2 notification.

    Possible values:
    - CONSUMPTION_REQUEST
    - DID_CHANGE_RENEWAL_PREF
    - DID_CHANGE_RENEWAL_STATUS
    - DID_FAIL_TO_RENEW
    - DID_RENEW
    - EXPIRED
    - GRACE_PERIOD_EXPIRED
    - OFFER_REDEEMED
    - PRICE_INCREASE
    - REFUND
    - REFUND_DECLINED
    - REFUND_REVERSED
    - RENEWAL_EXTENDED
    - RENEWAL_EXTENSION
    - REVOKE
    - SUBSCRIBED
    - TEST
  */

  notificationType: 'SUBSCRIBED' | 'EXPIRED';

  /* The object that contains the app metadata and signed renewal and transaction information. */

  data: {
    /* 
      The unique identifier of the app that the notification applies to.
      This property is available for apps that users download from the App Store.
      It isn’t present in the sandbox environment.
    */

    appAppleId: string;

    /* The server environment that the notification applies to, either sandbox or production. */

    environment: 'Sandbox' | 'Production';

    /* Transaction information signed by the App Store, in JSON Web Signature (JWS) format. */

    signedTransactionInfo: string;
  };
}

interface JWSTransactionDecodedPayload {
  appAccountToken: string;

  bundleId: string;

  environment: 'Sandbox' | 'Production';

  productId: string;

  type:
  | 'Auto-Renewable Subscription'
  | 'Non-Consumable'
  | 'Consumable'
  | 'Non-Renewing Subscription';

  transactionReason: 'PURCHASE' | 'RENEWAL';
}

const _webhookLogger = mainLogger.sub('app-store-webhook');

const baseProcedure = publicProcedure.input(
  z.object({
    signedPayload: z.string(),
  }),
);

export function registerAppStoreWebhook(fastify: ReturnType<typeof Fastify>) {
  fastify.post('/app-store/webhook', {
    handler: async (req, res) => {
      const ctx = createContext({ req, res });

      return await webhook({ ctx, input: req.body as any });
    },
  });
}

export async function webhook({
  input,
}: InferProcedureOpts<typeof baseProcedure>) {
  _webhookLogger.info('Signed payload: %o', input);

  const decodedPayloadSignature = jws.decode(input.signedPayload);

  if (!decodedPayloadSignature) {
    throw new Error('Failed to decode payload signature');
  }

  const decodedPayload =
    decodedPayloadSignature.payload as responseBodyV2DecodedPayload;

  _webhookLogger.info('Decoded payload: %o', decodedPayload);

  const decodedTransactionSignature = jws.decode(
    decodedPayload.data.signedTransactionInfo,
  );

  if (!decodedTransactionSignature) {
    throw new Error('Failed to decode transaction signature');
  }

  const decodedTransaction =
    decodedTransactionSignature.payload as JWSTransactionDecodedPayload;

  _webhookLogger.info('Decoded transaction: %o', decodedTransaction);
}
