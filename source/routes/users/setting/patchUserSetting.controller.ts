import { kysely } from '@library/database';
import { NotFound, Unauthorized } from '@library/httpError';
import { Database, User, UserSetting } from '@library/type';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Transaction, UpdateResult } from 'kysely';

export default function (request: FastifyRequest<{
	Params: {
		userId: User['id'];
	};
	Body: Partial<Omit<UserSetting, 'userId'>>;
}>, reply: FastifyReply): Promise<void> {
	if(request['userId'] !== request['params']['userId']) {
		throw new Unauthorized('Params["userId"] must be yourself');
	}

	return kysely.transaction()
		.setAccessMode('read write')
		.setIsolationLevel('serializable')
		.execute(function (transaction: Transaction<Database>): Promise<void> {
			return transaction.selectFrom('user')
				.where('user.id', '=', request['params']['userId'])
				.where('user.deleted_at', 'is', null)
				.executeTakeFirst()
				.then(function (user?: {}): Promise<UpdateResult> {
					if(user === undefined) {
						throw new NotFound('Params["userId"] must be valid');
					}

					return transaction.updateTable('user_setting')
						.set({
							is_group_notice_enabled: request['body']['isGroupNoticeEnabled'],
							is_post_enabled: request['body']['isPostEnabled'],
							is_schedule_enabled: request['body']['isScheduleEnabled'],
							is_fee_enabled: request['body']['isFeeEnabled']
						})
						.executeTakeFirstOrThrow();
				})
				.then(function (): void {
					reply.send(request['body']);
				});
		});
}