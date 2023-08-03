import Redis from 'ioredis';

export function createRedisInstance() {
  const hosts = process.env.KEYDB_HOSTS ?? '';

  if (hosts.includes(',')) {
    return new Redis.Cluster(
      hosts.split(',').map((host) => ({
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
  } else {
    return new Redis({
      host: hosts.split(':')[0],
      port: parseInt(hosts.split(':')[1]),
      password: process.env.KEYDB_PASSWORD,

      connectTimeout: 500,
      maxRetriesPerRequest: 1,

      showFriendlyErrorStack: !!process.env.DEV,
    });
  }
}
