import { BadRequest } from '@library/httpError';
import JsonWebToken from '@library/jsonWebToken';
import { DoneFuncWithErrOrRes, FastifyReply, FastifyRequest } from 'fastify';

export default function authHandler(request: FastifyRequest, reply: FastifyReply, done: DoneFuncWithErrOrRes): void {
	if(typeof request['headers']['authorization'] !== 'string' || !request['headers']['authorization'].startsWith('Bearer ')) {
		done(new BadRequest('Authroization type must be bearer'));

		return;
	}

	let jsonWebToken: JsonWebToken<{
		uid: number;
	}>;

	try {
		jsonWebToken = new JsonWebToken<{
			uid: number;
		}>(request['headers']['authorization'].slice(7), process['env']['JSON_WEB_TOKEN_SECRET']);
	} catch {
		done(new BadRequest('Authroization value must be valid json web token'));

		return;
	}

	if(!jsonWebToken.isValid()) {
		done(new BadRequest('Authroization value must be valid json web token'));

		return;
	}

	request['userId'] = jsonWebToken['payload']['uid'];

	done();
}