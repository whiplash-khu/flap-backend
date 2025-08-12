import { kysely } from '@library/database';
import { BadRequest } from '@library/httpError';
import JsonWebToken from '@library/jsonWebToken';
import { User } from '@library/type';
import { FastifyReply, FastifyRequest } from 'fastify';

export default function (request: FastifyRequest<{
	Body: {
		refreshToken: string;
	};
}>, reply: FastifyReply): Promise<void> {
	const refreshToken: JsonWebToken<{
		uid: number;
	}> = new JsonWebToken(request['body']['refreshToken'], '');

	return kysely.selectFrom('user')
		.select('password')
		.where('id', '=', refreshToken['payload']['uid'])
		.where('deleted_at', 'is', null)
		.executeTakeFirst()
		.then(function (user?: Pick<User, 'password'>): void {
			if(user === undefined) {
				throw new BadRequest('Body["refreshToken"] must be valid');
			}

			refreshToken['secretKey'] = user['password'];

			if(!refreshToken.isValid()) {
				throw new BadRequest('Body["refreshToken"] must be valid');
			}

			reply.send({
				accessToken: JsonWebToken.create({
					exp: JsonWebToken.getEpoch() + 7200,
					uid: refreshToken['payload']['uid']
				}, process['env']['JSON_WEB_TOKEN_SECRET'])
			});
		});
}