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
      },

      enableAutoPipelining: !!process.env.ENABLE_REDIS_AUTO_PIPELINING,
      scaleReads: 'master',

      showFriendlyErrorStack: !!process.env.DEV,
    },
  );
}
