import { encryptPbkdf2 } from '@library/crypto';
import { kysely } from '@library/database';
import { Unauthorized } from '@library/httpError';
import JsonWebToken from '@library/jsonWebToken';
import { User } from '@library/type';
import getEpoch from '@library/utility';
import { FastifyReply, FastifyRequest } from 'fastify';

export default function (request: FastifyRequest<{
	Body: Pick<User, 'email' | 'password'>;
}>, reply: FastifyReply): Promise<void> {
	let user: Pick<User, 'id' | 'password'>;

	return kysely.selectFrom('user')
		.select(['user.id', 'user.email', 'user.password', 'user.name', 'user.birth_at as birthAt', 'user.school'])
		.where('user.email', '=', request['body']['email'])
		.where('user.deleted_at', 'is', null)
		.executeTakeFirst()
		.then(function (_user?: Pick<User, 'id' | 'password'>): Promise<string> {
			if(_user === undefined) {
				throw new Unauthorized('Body["email"] and Body["password"] must be valid');
			}

			user = _user;

			return encryptPbkdf2(request['body']['password'], request['body']['email']);
		})
		.then(function (encryptedPassword: string): void {
			if(encryptedPassword !== user['password']) {
				throw new Unauthorized('Body["email"] and Body["password"] must be valid');
			}

			reply.send({
				id: user['id'],
				token: {
					refresh: JsonWebToken.create({
						exp: Number['MAX_SAFE_INTEGER'],
						uid: user['id']
					}, encryptedPassword),
					access: JsonWebToken.create({
						exp: getEpoch() + 7200,
						uid: user['id']
					}, process['env']['JSON_WEB_TOKEN_SECRET'])
				}
			});
		});
}