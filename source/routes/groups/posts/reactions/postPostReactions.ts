import { kysely } from '@library/database';
import { NotFound, Unauthorized, BadRequest } from '@library/httpError';
import { Post, Database, GroupUser, PostReaction } from '@library/type';
import { FastifyReply, FastifyRequest } from 'fastify';
import { InsertResult, JoinBuilder, Nullable, Transaction } from 'kysely';

export default function (request: FastifyRequest<{
	Params: {
		groupId: Post['groupId'];
		postId: PostReaction['postId'];
	};
	Body: {
		emoji: PostReaction['emoji'];
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
				.then(function (groupWithUser?: Nullable<Pick<GroupUser, 'userId'>>){
					if(groupWithUser === undefined) {
						throw new NotFound('Params ["groupId"] must be valid');
					}

					if(typeof groupWithUser['userId'] !== 'number') {
						throw new Unauthorized('Params["userId"] must in group');
					}

					return transaction.selectFrom('post')
						.select('post.id')
						.where('post.group_id', '=', request['params']['groupId'])
						.where('post.id', '=', request['params']['postId'])
						.where('post.deleted_at', 'is', null)
						.executeTakeFirstOrThrow()
				})
				.then((): Promise<{ postId: number } | undefined> => {
					return transaction.selectFrom('post_reaction')
						.select('post_id as postId')
						.where('post_reaction.post_id', '=', request['params']['postId'])
						.where('post_reaction.user_id', '=', request['userId'])
						.executeTakeFirst();
				})
				.then((emoji?: { postId: number }): Promise<InsertResult[]> => {
					if(emoji !== undefined) {
						throw new BadRequest('Body["emoji"] is already register');
					}
					return transaction.insertInto('post_reaction')
						.values({ 
							post_id: request['params']['postId'], 
							user_id: request['userId'], 
							emoji: request['body']['emoji']
						})
						.execute()
				})
				.then((): void => {
					reply.status(201)
						.send();
				});
		});
}