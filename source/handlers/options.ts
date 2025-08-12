import { FastifyRequest, FastifyReply } from 'fastify';

export default function optionsHandler(request: FastifyRequest, reply: FastifyReply): void {
	reply.status(204)
		.send();
}