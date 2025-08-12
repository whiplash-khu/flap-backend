import { FastifyReply, FastifyRequest } from 'fastify';

export default function dummyHandler(request: FastifyRequest, reply: FastifyReply): void {
	reply.status(204)
		.send();
}