import { NotFound } from '@library/httpError';
import { FastifyRequest, FastifyReply } from 'fastify';

export default function notFoundHandler(request: FastifyRequest, reply: FastifyReply): void {
	throw new NotFound('Page not found');
}