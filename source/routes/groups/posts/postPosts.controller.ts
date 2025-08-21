import { kysely } from '@library/database';
import { NotFound, Unauthorized } from '@library/httpError';
import { Post, Database, GroupUser } from '@library/type';
import { FastifyReply, FastifyRequest } from 'fastify';
import { JoinBuilder, Nullable, Transaction } from 'kysely';

export default function (request: FastifyRequest<{
	Params: {
		groupId: Post['groupId'];
	};
	Body: {
		content: Post['content'];
		isNotice: Post['isNotice'];
	};
}>, reply: FastifyReply): Promise<void> {
	return kysely.transaction()
		.setAccessMode('read write')
		.setIsolationLevel('serializable')
		.execute(function (transaction: Transaction<Database>): Promise<void> {
			return transaction.selectFrom('group')
				.select('group.id')
				.leftJoin('group_user', function (joinBuilder: JoinBuilder<Database, 'group' | 'group_user'>): JoinBuilder<Database, 'group' | 'group_user'> {
					return joinBuilder
						.onRef('group.id', '=', 'group_user.group_id')
						.on('group_user.user_id', '=', request['userId']);
				})
				.select('group_user.user_id as userId')
				.where('group.id', '=', Number(request['params']['groupId']))
				.where('group.deleted_at', 'is', null)
				.executeTakeFirst()
				.then(function (groupWithUser?: Nullable<Pick<GroupUser, 'userId'>>): Promise<Pick<Post,'id'>> {
					if(groupWithUser === undefined) {
						throw new NotFound('Params ["groupId"] must be valid');
					}

					if(typeof groupWithUser['userId'] !== 'number') {
						throw new Unauthorized('Params["userId"] must in group');
					}

					return transaction.insertInto('post')
						.values({
							group_id: request['params']['groupId'],
							user_id: request['userId'],
							is_notice: request['body']['isNotice'],
							content: request['body']['content']
						})
						.returning('id')
						.executeTakeFirstOrThrow();
				})
				.then(function (groupPost: Pick<Post, 'id'>): void {
					reply.status(201)
						.send(groupPost);
				});
		});
}