import { LOST_PASSWORD_TEMPLATE } from '@library/constant';
import { kysely, createUniqueToken } from '@library/database';
import { BadRequest } from '@library/httpError';
import { sendMail } from '@library/mailer';
import { Database, User, UserLostPasswordTable } from '@library/type';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Insertable, InsertResult, Transaction } from 'kysely';

export default function (request: FastifyRequest<{
	Body: Pick<User, 'email'>;
}>, reply: FastifyReply): Promise<void> {
	return kysely.transaction()
		.setAccessMode('read write')
		.setIsolationLevel('serializable')
		.execute(function (transaction: Transaction<Database>): Promise<void> {
			// lazy
			const userLostPassword: Insertable<UserLostPasswordTable> = {} as Insertable<UserLostPasswordTable>;

			return kysely.selectFrom('user')
				.select('id')
				.where('email', '=', request['body']['email'])
				.where('deleted_at', 'is', null)
				.executeTakeFirst()
				.then(function (user?: Pick<User, 'id'>): Promise<string> {
					if(user === undefined) {
						throw new BadRequest('Body["email"] must be valid');
					}

					userLostPassword['user_id'] = user['id'];

					return createUniqueToken(kysely, 'user_lost_password');
				})
				.then(function (token: string): Promise<InsertResult> {
					userLostPassword['token'] = token;

					return transaction.insertInto('user_lost_password')
						.values(userLostPassword)
						.executeTakeFirstOrThrow();
				})
				.then(function (): Promise<boolean> {
					return sendMail(request['body']['email'], '[Flap] 비밀번호 재설정', LOST_PASSWORD_TEMPLATE.replace(/{token}/g, userLostPassword['token']));
				})
				.then(function (): void {
					reply.status(204)
						.send();
				});
		});
}