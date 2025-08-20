import 'fastify';

declare module 'fastify' {
	interface FastifyRequest {
		userId: number;
		file: {
			hash: string;
			buffer: Buffer;
			mimeType: string;
		};
	}
}