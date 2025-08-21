import { kysely } from '@library/database';
import { NotFound, Unauthorized } from '@library/httpError';
import { Post, Database, User } from '@library/type';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Transaction, JoinBuilder, Nullable } from 'kysely';

export default function (request: FastifyRequest<{
	Params: {
		groupId: Post['groupId'];
		postId: Post['id'];
	};
}>, reply: FastifyReply): Promise<void> {
	return kysely.transaction()
		.setAccessMode('read only')		 
		.setIsolationLevel('repeatable read')
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
				.then(function (groupWithUser?: Nullable<Pick<Post, 'userId'>>) {
					if(groupWithUser === undefined) {
						throw new NotFound('Params ["groupId"] must be valid');
					}

					if(typeof groupWithUser['userId'] !== 'number') {
						throw new Unauthorized('Params["userId"] must in group');
					}

					return transaction.selectFrom('post')
						.innerJoin('user', 'user.id', 'post.user_id')
						.select([
							'post.id',
							'post.content',
							'post.created_at as createdAt',
							'post.is_notice as isNotice',
							'user.id as userId',
							'user.name',
						])
						.where('post.group_id', '=', request['params']['groupId'])
						.where('post.id', '=', request['params']['postId'])
						.where('post.deleted_at', 'is', null)
						.executeTakeFirstOrThrow();
				})
				.then(function (_groupPost): Promise<void> {
					return transaction.selectFrom('post_reaction')
						.select(['emoji'])
						.select(kysely.fn.countAll<number>().as('count'))
						.where('post_id', '=', request['params']['postId'])
						.groupBy('emoji')
						.execute()
						.then(function (emojis: { emoji: string; count: number }[]): void {
							const reactions: Record<string, number> = {};
							for (let i = 0; i < emojis.length; i++) {
								reactions[emojis[i]['emoji']] = emojis[i]['count'];
							}
							reply.send({
								id: _groupPost['id'],
								content: _groupPost['content'],
								createdAt: _groupPost['createdAt'],
								isNotice: _groupPost['isNotice'],
								reactions,
								user: {
									id: _groupPost['userId'],
									name: _groupPost['name']
								}
							});
						});
				});
		});
}