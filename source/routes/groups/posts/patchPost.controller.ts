import { kysely } from '@library/database';
import { NotFound, Unauthorized } from '@library/httpError';
import { Post, Database } from '@library/type';
import { FastifyReply, FastifyRequest } from 'fastify';
import { JoinBuilder, Nullable, Transaction, UpdateResult } from 'kysely';

export default function (request: FastifyRequest<{
	Params: {
		groupId: Post['groupId'];
		postId: Post['id'];
	};
	Body: Partial<Pick<Post, | 'content' | 'isNotice'>>;
}>, reply: FastifyReply): Promise<void> {
	return kysely.transaction()
		.setAccessMode('read write')
		.setIsolationLevel('serializable')
		.execute(function (transaction: Transaction<Database>): Promise<void> {
			return transaction.selectFrom('group')
				.select('group.id')
				.leftJoin('group_user', function (joinBuilder: JoinBuilder<Database, 'group' | 'group_user'>): JoinBuilder<Database, 'group' | 'group_user'> {
					return joinBuilder.onRef('group.id', '=', 'group_user.group_id')
						.on('group_user.user_id', '=', request['userId']);
				})
				.select('group_user.user_id as userId')
				.where('group.id', '=', request['params']['groupId'])
				.where('group.deleted_at', 'is', null)
				.executeTakeFirst()
				.then(function (groupWithUser?: Nullable<Pick<Post, 'userId'>>): Promise<UpdateResult> {
					if(groupWithUser === undefined) {
						throw new NotFound('Params ["groupId"] must be valid');
					}

					if(typeof groupWithUser['userId'] !== 'number') {
						throw new Unauthorized('Params["userId"] must in group');
					}

					return transaction.updateTable('post')
						.set({
							content: request['body']['content'],
							is_notice: request['body']['isNotice']
						})
						.where('group_id', '=', request['params']['groupId'])
						.where('id', '=', request['params']['postId'])
						.where('post.user_id', '=', request['userId'])
						.executeTakeFirstOrThrow();
				})
				.then(function (): void {
					reply.status(204)
						.send();
				});
					
		});
}