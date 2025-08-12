import { DoneFuncWithErrOrRes, FastifyRequest, FastifyReply } from 'fastify';

export default function headerHandler(request: FastifyRequest, reply: FastifyReply, done: DoneFuncWithErrOrRes): void {
	// lazy
	reply.headers({
		'Access-Control-Allow-Methods': '*',
		'Access-Control-Allow-Headers': '*',
	});

	done();
}