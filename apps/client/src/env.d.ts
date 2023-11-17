/* eslint-disable */

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: string;
    VUE_ROUTER_MODE: 'hash' | 'history' | 'abstract' | undefined;
    VUE_ROUTER_BASE: string | undefined;

    DEV: string;
    PROD: string;
    DEBUGGING: string;
    CLIENT: string;
    SERVER: string;
    MODE: 'spa' | 'ssr' | 'pwa' | 'bex' | 'cordova' | 'capacitor' | 'electron';

    STAGING?: string;

    SEND_EMAILS: string;

    HOST: string;

    APP_SERVER_PORT: string;
    APP_SERVER_URL: string;

    CLIENT_PORT: string;
    CLIENT_URL: string;

    REALTIME_SERVER_PORT: string;
    REALTIME_SERVER_URL: string;

    COLLAB_SERVER_PORT: string;
    COLLAB_SERVER_URL: string;

    ACCESS_SECRET: string;
    REFRESH_SECRET: string;

    EMAIL_CASE_SENSITIVITY_EXCEPTIONS: string;

    USER_EMAIL_ENCRYPTION_KEY: string;
    USER_EMAIL_SECRET: string;
    USER_REHASHED_LOGIN_HASH_ENCRYPTION_KEY: string;
    USER_AUTHENTICATOR_SECRET_ENCRYPTION_KEY: string;
    USER_RECOVERY_CODES_ENCRYPTION_KEY: string;

    GROUP_REHASHED_PASSWORD_HASH_ENCRYPTION_KEY: string;

    KEYDB_HOSTS: string;
    KEYDB_PASSWORD: string;

    POSTGRES_HOST: string;
    POSTGRES_PORT: string;
    POSTGRES_USER: string;
    POSTGRES_PASSWORD: string;
    POSTGRES_DATABASE: string;
    POSTGRES_CA_CERTIFICATE: string;

    MAILJET_API_KEY: string;
    MAILJET_API_SECRET: string;

    BREVO_API_KEY: string;

    SENDGRID_API_KEY: string;

    STRIPE_SECRET_KEY: string;
    STRIPE_WEBHOOK_SECRET: string;
    STRIPE_MONTHLY_PRICE_ID: string;
    STRIPE_YEARLY_PRICE_ID: string;
  }
}
