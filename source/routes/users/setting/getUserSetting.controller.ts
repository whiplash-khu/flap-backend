import { kysely } from '@library/database';
import { NotFound, Unauthorized } from '@library/httpError';
import { Database, User, UserSetting } from '@library/type';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Transaction } from 'kysely';

export default function (request: FastifyRequest<{
	Params: {
		userId: User['id'];
	};
}>, reply: FastifyReply): Promise<void> {
	if(request['userId'] !== request['params']['userId']) {
		throw new Unauthorized('Params["userId"] must be yourself');
	}

	return kysely.transaction()
		.setAccessMode('read only')
		.setIsolationLevel('serializable')
		.execute(function (transaction: Transaction<Database>): Promise<void> {
			return transaction.selectFrom('user')
				.innerJoin('user_setting', 'user.id', 'user_setting.user_id')
				.select([
					'user_setting.is_group_notice_enabled as isGroupNoticeEnabled',
					'user_setting.is_post_enabled as isPostEnabled',
					'user_setting.is_schedule_enabled as isScheduleEnabled',
					'user_setting.is_fee_enabled as isFeeEnabled'
				])
				.where('user.id', '=', request['params']['userId'])
				.where('user.deleted_at', 'is', null)
				.executeTakeFirst()
				.then(function (userWithSetting?: Omit<UserSetting, 'userId'>): void {
					if(userWithSetting === undefined) {
						throw new NotFound('Params["userId"] must be valid');
					}

					reply.send(userWithSetting);
				});
		});
}