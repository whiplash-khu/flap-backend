import { encryptPbkdf2 } from '@library/crypto';
import { kysely } from '@library/database';
import { BadRequest, NotFound, Unauthorized } from '@library/httpError';
import JsonWebToken from '@library/jsonWebToken';
import { Database, Media, User } from '@library/type';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Transaction, UpdateResult } from 'kysely';

export default function (request: FastifyRequest<{
	Params: {
		userId: User['id'];
	};
	Body: Partial<Pick<User, 'password' | 'name' | 'birthAt' | 'school' | 'mediaId'>>
}>, reply: FastifyReply): Promise<void> {
	if(request['userId'] !== request['params']['userId']) {
		throw new Unauthorized('Params["userId"] must be yourself');
	}

	return kysely.transaction()
		.setAccessMode('read write')
		.setIsolationLevel('serializable')
		.execute(function (transaction: Transaction<Database>): Promise<void> {
			const shouldUpdatePassword: boolean = typeof request['body']['password'] === 'string';
			let encryptedPassword: string | undefined;
			let media: Pick<Media, 'hash' | 'type'> | undefined;

			return transaction.selectFrom('user')
				.select('email')
				.where('id', '=', request['params']['userId'])
				.where('deleted_at', 'is', null)
				.executeTakeFirst()
				.then(function (user?: Pick<User, 'email'>): Promise<string | undefined> | undefined {
					if(user === undefined) {
						throw new NotFound('Params["userId"] must be valid');
					}

					if(shouldUpdatePassword) {
						return;
					}

					return encryptPbkdf2(request['body']['password'] as string, user['email']);
				})
				.then(function (_encryptedPassword?: string): Promise<Pick<Media, 'hash' | 'type'> | undefined> | undefined {
					encryptedPassword = _encryptedPassword;

					if(request['body']['mediaId'] === undefined) {
						return;
					}

					return kysely.selectFrom('media')
						.select(['hash', 'type'])
						.where('id', '=', request['body']['mediaId'])
						.executeTakeFirst();

				})
				.then(function (_media?: Pick<Media, 'hash' | 'type'>): Promise<UpdateResult> {
					if(_media === undefined) {
						throw new BadRequest('Body["mediaId"] must be valid');
					}

					media = _media;

					return kysely.updateTable('user')
						.set({
							password: encryptedPassword,
							name: request['body']['name'],
							birth_at: request['body']['birthAt'],
							school: request['body']['school'],
							media_id: request['body']['mediaId']
						})
						.where('id', '=', request['params']['userId'])
						.executeTakeFirst();
				})
				.then(function (): void {
					reply.send({
						refreshToken: shouldUpdatePassword ? JsonWebToken.create({
							exp: Number['MAX_SAFE_INTEGER'],
							uid: request['params']['userId']
						}, encryptedPassword as string) : undefined,
						name: request['body']['name'],
						birthAt: request['body']['birthAt'],
						school: request['body']['school'],
						media: media
					});
				});
		});
}