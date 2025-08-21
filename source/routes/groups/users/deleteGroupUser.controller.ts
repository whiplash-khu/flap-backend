import { kysely } from '@library/database';
import { NotFound, Unauthorized } from '@library/httpError';
import { Database, Group, GroupUser } from '@library/type';
import { FastifyReply, FastifyRequest } from 'fastify';
import { DeleteResult, JoinBuilder, Transaction } from 'kysely';

export default function (request: FastifyRequest<{
		Params: Pick<GroupUser, 'groupId' | 'userId'>;
}>, reply: FastifyReply): Promise<void> {
	return kysely.transaction()
		.setAccessMode('read write')
		.setIsolationLevel('serializable')
		.execute(function (transaction: Transaction<Database>): Promise<void> {
			return transaction.selectFrom('group')
				.select('group.user_id as userId')
				.leftJoin('group_user', function (joinBuilder: JoinBuilder<Database, 'group' | 'group_user'>): JoinBuilder<Database, 'group' | 'group_user'> {
					return joinBuilder.onRef('group.id', '=', 'group_user.group_id')
						.on('group_user.user_id', '=', request['userId']);
				})
				.select('group_user.user_id as _userId')
				.where('group.id', '=', request['params']['groupId'])
				.where('group.deleted_at', 'is', null)
				.executeTakeFirst()
				.then(function (groupWithUser?: Pick<Group, 'userId'> & {
					_userId: GroupUser['userId'] | null;
				}): Promise<DeleteResult> {
					if(groupWithUser === undefined) {
						throw new NotFound('Params["groupId"] must be valid');
					}

					if(groupWithUser['userId'] !== request['userId'] && groupWithUser['_userId'] !== request['userId']) {
						throw new Unauthorized('User must be group owner or yourself');
					}

					return transaction.deleteFrom('group_user')
						.where('group_id', '=', request['params']['groupId'])
						.where('user_id', '=', request['params']['userId'])
						.executeTakeFirstOrThrow();
				})
				.then(function (): void {
					reply.status(204)
						.send();
				});
		});
}