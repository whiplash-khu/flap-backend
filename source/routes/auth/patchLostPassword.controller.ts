import { encryptPbkdf2 } from '@library/crypto';
import { kysely } from '@library/database';
import { BadRequest } from '@library/httpError';
import { Database, User, UserLostPassword } from '@library/type';
import { getPreciseEpoch, getTimestamp } from '@library/time';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Transaction, UpdateResult } from 'kysely';

export default function (request: FastifyRequest<{
	Body: Pick<UserLostPassword & User, 'token' | 'password'>;
}>, reply: FastifyReply): Promise<void> {
	return kysely.transaction()
		.setAccessMode('read write')
		.setIsolationLevel('serializable')
		.execute(function (transaction: Transaction<Database>): Promise<void> {
			let userId: User['id'];

			return transaction.selectFrom('user_lost_password')
				.innerJoin('user', 'user_lost_password.user_id', 'user.id')
				.select([
					'user.id',
					'user.email'
				])
				.where('user_lost_password.token', '=', request['body']['token'])
				.where('user_lost_password.created_at', '>', getTimestamp(getPreciseEpoch() - 43200))
				.executeTakeFirst()
				.then(function (user?: Pick<User, 'id' | 'email'>): Promise<string> {
					if(user === undefined) {
						throw new BadRequest('Body["token"] must be valid');
					}

					userId = user['id'];

					return encryptPbkdf2(request['body']['password'], user['email']);
				})
				.then(function (encryptedPassword: string): Promise<UpdateResult> {
					return kysely.updateTable('user')
						.set({
							password: encryptedPassword
						})
						.where('id', '=', userId)
						.executeTakeFirstOrThrow();
				})
				.then(function (): void {
					reply.status(204)
						.send();
				});
		});
}