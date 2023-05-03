import Redis from 'ioredis';

export function createRedisInstance() {
  return new Redis.Cluster(
    process.env.KEYDB_HOSTS!.split(',').map((host) => ({
      host: host.split(':')[0],
      port: parseInt(host.split(':')[1]),
    })),

    {
      redisOptions: {
        password: process.env.KEYDB_PASSWORD,

        connectTimeout: 500,
        maxRetriesPerRequest: 1,
      },

      enableAutoPipelining: true,
      scaleReads: 'master',

      showFriendlyErrorStack: !!process.env.DEV,
    },
  );
}
