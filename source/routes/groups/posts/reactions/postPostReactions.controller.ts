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
				.where('group.id', '=', request['params']['groupId'])
				.where('group.deleted_at', 'is', null)
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
				.select('post.id as postId')
				.leftJoin('post_reaction', function (joinBuilder: JoinBuilder<Database, 'group' | 'group_user' | 'post' | 'post_reaction'>): typeof joinBuilder {
					return joinBuilder.onRef('post.id', '=', 'post_reaction.post_id')
						.on('post_reaction.user_id', '=', request['userId']);
				})
				.select('post_reaction.emoji')
				.executeTakeFirst()
				.then(function (groupWithReaction?: Nullable<Pick<GroupUser & PostReaction, 'userId' | 'emoji'> & {
					postId: Post['id'];
				}>): Promise<InsertResult> {
					if(groupWithReaction === undefined) {
						throw new NotFound('Params["groupId"] must be valid');
					}

					if(groupWithReaction['userId'] === null) {
						throw new Unauthorized('User must be in group');
					}

					if(groupWithReaction['postId'] === null) {
						throw new NotFound('Params["postId"] must be valid');
					}

					if(groupWithReaction['emoji'] !== null) {
						throw new BadRequest('Body["emoji"] must be unique');
					}

					return transaction.insertInto('post_reaction')
						.values({ 
							post_id: request['params']['postId'],
							user_id: request['userId'],
							emoji: request['body']['emoji']
						})
						.executeTakeFirstOrThrow();
				})
				.then(function (): void {
					reply.status(204)
						.send();
				});
		});
}