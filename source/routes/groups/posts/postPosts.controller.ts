import { kysely } from '@library/database';
import { NotFound, Unauthorized } from '@library/httpError';
import { Post, Database, GroupUser, Group } from '@library/type';
import { FastifyReply, FastifyRequest } from 'fastify';
import { JoinBuilder, Transaction } from 'kysely';

export default function (request: FastifyRequest<{
	Params: Pick<Post, 'groupId'>;
	Body: Pick<Post, 'content' | 'isNotice'>;
}>, reply: FastifyReply): Promise<void> {
	return kysely.transaction()
		.setAccessMode('read write')
		.setIsolationLevel('serializable')
		.execute(function (transaction: Transaction<Database>): Promise<void> {
			return transaction.selectFrom('group')
				.select('group.user_id as userId')
				.leftJoin('group_user', function (joinBuilder: JoinBuilder<Database, 'group' | 'group_user'>): typeof joinBuilder {
					return joinBuilder
						.onRef('group.id', '=', 'group_user.group_id')
						.on('group_user.user_id', '=', request['userId']);
				})
				.select('group_user.user_id as _userId')
				.where('group.id', '=', request['params']['groupId'])
				.where('group.deleted_at', 'is', null)
				.executeTakeFirst()
				.then(function (groupWithUser?: Pick<Group, 'userId'> & {
					_userId: GroupUser['userId'] | null;
				}): Promise<Pick<Post,'id'>> {
					if(groupWithUser === undefined) {
						throw new NotFound('Params["groupId"] must be valid');
					}

					if(groupWithUser['_userId'] === null) {
						throw new Unauthorized('User must be in group');
					}

					if(groupWithUser['userId'] !== request['userId'] && request['body']['isNotice']) {
						throw new Unauthorized('User must be group owner');
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
				.then(function (post: Pick<Post, 'id'>): void {
					reply.status(201)
						.send(post);
				});
		});
}