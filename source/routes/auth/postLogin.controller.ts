import { encryptPbkdf2 } from '@library/crypto';
import { kysely } from '@library/database';
import { Unauthorized } from '@library/httpError';
import JsonWebToken from '@library/jsonWebToken';
import { Media, User } from '@library/type';
import { FastifyReply, FastifyRequest } from 'fastify';

export default function (request: FastifyRequest<{
	Body: Pick<User, 'email' | 'password'>;
}>, reply: FastifyReply): Promise<void> {
	let userAndMedia: Pick<User & Media, 'id' | 'email' | 'password' | 'name' | 'birthAt' | 'school' | 'hash' | 'type'>;

	return kysely.selectFrom('user')
		.select(['user.id', 'user.email', 'user.password', 'user.name', 'user.birth_at as birthAt', 'user.school'])
		.innerJoin('media', 'user.media_id', 'media.id')
		.select(['media.hash', 'media.type'])
		.where('user.email', '=', request['body']['email'])
		.where('user.deleted_at', 'is', null)
		.executeTakeFirst()
		.then(function (_userAndMedia?: typeof userAndMedia): Promise<string> {
			if(_userAndMedia === undefined) {
				throw new Unauthorized('Body["email"] and Body["password"] must be valid');
			}

			userAndMedia = _userAndMedia;

			return encryptPbkdf2(request['body']['password'], request['body']['email']);
		})
		.then(function (encryptedPassword: string): void {
			if(encryptedPassword !== userAndMedia['password']) {
				throw new Unauthorized('Body["email"] and Body["password"] must be valid');
			}

			reply.send({
				user: {
					email: userAndMedia['email'],
					name: userAndMedia['name'],
					birthAt: userAndMedia['birthAt'],
					school: userAndMedia['school'],
					media: {
						hash: userAndMedia['hash'],
						type: userAndMedia['type']
					}
				},
				token: {
					refresh: JsonWebToken.create({
						exp: Number['MAX_SAFE_INTEGER'],
						uid: userAndMedia['id']
					}, encryptedPassword),
					access: JsonWebToken.create({
						exp: JsonWebToken.getEpoch() + 7200,
						uid: userAndMedia['id']
					}, process['env']['JSON_WEB_TOKEN_SECRET'])
				}
			});
		});
}