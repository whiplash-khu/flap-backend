import { FastifyReply, FastifyRequest } from 'fastify';

export default function (request: FastifyRequest, reply: FastifyReply): void {
	reply.send('Contact: mailto:me@kangmin.kim\nExpires: ' + ((new Date()).getFullYear() + 1) + '-01-01T00:00:00.000Z\nPreferred-Languages: ko, en\nCanonical: https://api.flap.kr/.well-known/security.txt');
}