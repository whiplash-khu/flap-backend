import { kysely } from '@library/database';
import { NotFound, Unauthorized } from '@library/httpError';
import { Post, Database, GroupUser } from '@library/type';
import { FastifyReply, FastifyRequest } from 'fastify';
import { JoinBuilder, Nullable, Transaction, UpdateResult } from 'kysely';

export default function (request: FastifyRequest<{
	Params: {
		groupId: Post['groupId'];
		postId: Post['id'];
	};
	Body: Partial<Pick<Post, 'title' | 'content' | 'isNotice'>>;
}>, reply: FastifyReply): Promise<void> {
	return kysely.transaction()
		.setAccessMode('read write')
		.setIsolationLevel('serializable')
		.execute(function (transaction: Transaction<Database>): Promise<void> {
			return transaction.selectFrom('group')
				.leftJoin('group_user', function (joinBuilder: JoinBuilder<Database, 'group' | 'group_user'>): typeof joinBuilder {
					return joinBuilder.onRef('group.id', '=', 'group_user.group_id')
						.on('group_user.user_id', '=', request['userId']);
				})
				.select('group_user.user_id as userId')
				.leftJoin('post', function (joinBuilder: JoinBuilder<Database, 'group' | 'group_user' | 'post'>): typeof joinBuilder {
					return joinBuilder.onRef('group.id', '=', 'post.group_id')
						.on('post.id', '=', request['params']['postId'])
						.on('post.deleted_at', 'is', null);
				})
				.select('post.user_id as _userId')
				.where('group.id', '=', request['params']['groupId'])
				.where('group.deleted_at', 'is', null)
				.executeTakeFirst()
				.then(function (groupWithUserAndPost?: Nullable<{
					userId: GroupUser['userId'];
					_userId: Post['userId'];
				}>): Promise<UpdateResult> {
					if(groupWithUserAndPost === undefined) {
						throw new NotFound('Params["groupId"] must be valid');
					}

					if(groupWithUserAndPost['userId'] === null) {
						throw new Unauthorized('User must be in group user');
					}

					if(groupWithUserAndPost['_userId'] === null) {
						throw new NotFound('Params["postId"] must be valid');
					}

					if(groupWithUserAndPost['_userId'] !== request['userId']) {
						throw new Unauthorized('Post["userId"] must be yourself');
					}

					return transaction.updateTable('post')
						.set({
							title: request['body']['title'],
							content: request['body']['content'],
							is_notice: request['body']['isNotice']
						})
						.where('group_id', '=', request['params']['groupId'])
						.where('id', '=', request['params']['postId'])
						.executeTakeFirstOrThrow();
				})
				.then(function (): void {
					reply.status(204)
						.send();
				});

		});
}