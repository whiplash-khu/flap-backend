import { BadRequest } from '@library/httpError';
import JsonWebToken from '@library/jsonWebToken';
import { DoneFuncWithErrOrRes, FastifyReply, FastifyRequest } from 'fastify';

export default function authHandler(request: FastifyRequest, reply: FastifyReply, done: DoneFuncWithErrOrRes): void {
	if(typeof request['headers']['authorization'] !== 'string' || !request['headers']['authorization'].startsWith('Bearer ')) {
		reply.send(new BadRequest('Authroization type must be bearer'));

		return;
	}

	const jsonWebToken: JsonWebToken<{
		userId: number;
	}> = new JsonWebToken<{
		userId: number;
	}>(request['headers']['authorization'].slice(7), process['env']['JSON_WEB_TOKEN_SECRET']);

	if(!jsonWebToken.isValid()) {
		reply.send(new BadRequest('Authroization value must be valid json web token'));

		return;
	}

	request['userId'] = jsonWebToken['payload']['userId'];

	done();
}