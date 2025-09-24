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
	Body: Partial<Pick<User, 'password' | 'name' | 'birthdate' | 'isMale' | 'school' | 'admissionYear' | 'mediaId'> & {
		previousPassword: User['password'];
	}>;
}>, reply: FastifyReply): Promise<void> {
	if(request['userId'] !== request['params']['userId']) {
		throw new Unauthorized('Params["userId"] must be yourself');
	}

	return kysely.transaction()
		.setAccessMode('read write')
		.setIsolationLevel('serializable')
		.execute(function (transaction: Transaction<Database>): Promise<void> {
			const shouldUpdatePassword: boolean = typeof request['body']['password'] === 'string' && typeof request['body']['previousPassword'] === 'string';
			const shouldUpdateMediaId: boolean = typeof request['body']['mediaId'] === 'number';
			let user: Pick<User, 'password' | 'email'>;
			let encryptedPassword: string | undefined;
			let media: Pick<Media, 'hash' | 'type'> | undefined;

			return (shouldUpdatePassword ? transaction.selectFrom('user')
				.select([
					'password',
					'email'
				])
				.where('id', '=', request['params']['userId'])
				.executeTakeFirst()
				.then(function (_user?: Pick<User, 'password' | 'email'>): Promise<string> {
					if(_user === undefined) {
						throw new NotFound('Params["userId"] must be valid');
					}

					user = _user;

					return encryptPbkdf2(request['body']['previousPassword'] as string, user['email']);
				})
				.then(function (encryptedPreviousPassword: string): Promise<string> {
					if(encryptedPreviousPassword !== user['password']) {
						throw new BadRequest('Body["previousPassword"] must be valid');
					}

					return encryptPbkdf2(request['body']['password'] as string, user['email']);
				}) : Promise.resolve() as Promise<undefined>)
				.then(function (_encryptedPassword?: string): Promise<Pick<Media, 'hash' | 'type'> | undefined> | undefined {
					encryptedPassword = _encryptedPassword;

					if(typeof request['body']['admissionYear'] === 'number' && request['body']['admissionYear'] > (new Date()).getUTCFullYear()) {
						throw new BadRequest('Body["admissionYear"] must not be later than now');
					}

					if(!shouldUpdateMediaId) {
						return;
					}

					return kysely.selectFrom('media')
						.select([
							'hash',
							'type'
						])
						.where('id', '=', request['body']['mediaId'] as number)
						.executeTakeFirst();
				})
				.then(function (_media?: Pick<Media, 'hash' | 'type'>): Promise<UpdateResult> {
					if(shouldUpdateMediaId && _media === undefined) {
						throw new BadRequest('Body["mediaId"] must be valid');
					}

					media = _media;

					return kysely.updateTable('user')
						.set({
							password: encryptedPassword,
							name: request['body']['name'],
							birthdate: request['body']['birthdate'],
							is_male: request['body']['isMale'],
							school: request['body']['school'],
							admission_year: request['body']['admissionYear'],
							media_id: request['body']['mediaId']
						})
						.where('id', '=', request['params']['userId'])
						.executeTakeFirstOrThrow();
				})
				.then(function (): void {
					reply.send({
						refreshToken: shouldUpdatePassword ? JsonWebToken.create({
							exp: Number['MAX_SAFE_INTEGER'],
							uid: request['params']['userId']
						}, encryptedPassword as string) : undefined,
						name: request['body']['name'],
						birthdate: request['body']['birthdate'],
						is_male: request['body']['isMale'],
						school: request['body']['school'],
						admission_year: request['body']['admissionYear'],
						media: media
					});
				});
		});
}