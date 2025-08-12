import { FastifyReply, FastifyRequest } from 'fastify';

export default function (request: FastifyRequest, reply: FastifyReply): void {
	reply.send({
		message: '날개야, 다시 돋아라. 날자. 날자. 날자. 한 번만 더 날자꾸나. 한 번만 더 날아보자꾸나.'
	});
}