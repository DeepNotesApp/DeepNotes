import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    locals: {
      userId: string;
      sessionId: string;
    };
  }
}
