import { Emojis } from '@library/constant';
import { kysely } from '@library/database';
import { NotFound, Unauthorized } from '@library/httpError';
import { Post, Database, Pagenation, User, Media, PostReaction } from '@library/type';
import { FastifyReply, FastifyRequest } from 'fastify';
import { JoinBuilder, Nullable, SelectQueryBuilder, sql, Transaction } from 'kysely';

export default function (request: FastifyRequest<{
	Querystring: Pagenation;
	Params: {
		groupId: Post['groupId'];
	};
}>, reply: FastifyReply): Promise<void> {
	return kysely.transaction()
		.setAccessMode('read only')		 
		.setIsolationLevel('repeatable read')
		.execute(function (transaction: Transaction<Database>): Promise<void> {
			const posts: (Pick<Post, 'id' | 'content' | 'createdAt' | 'isNotice'> & {
				user: Pick<User, 'id' | 'name'> & {
					media: Pick<Media, 'id' | 'hash' | 'type'>;
				};
				reactionCounts: {
					count: number;
					isReacted: boolean;
				}[];
			})[] = [];

			return transaction.selectFrom('group')
				.leftJoin('group_user', function (joinBuilder: JoinBuilder<Database, 'group' | 'group_user'>): typeof joinBuilder {
					return joinBuilder.onRef('group.id', '=', 'group_user.group_id')
						.on('group_user.user_id', '=', request['userId']);
				})
				.select('group_user.user_id as userId')
				.where('group.id', '=', request['params']['groupId'])
				.where('group.deleted_at', 'is', null)
				.executeTakeFirst()
				.then(function (groupWithUser?: Nullable<Pick<Post, 'userId'>>): Promise<Pick<Post & User & Media, 'id' | 'content' | 'createdAt' | 'isNotice' | 'userId' | 'name' | 'mediaId' | 'hash' | 'type'>[]> {
					if(groupWithUser === undefined) {
						throw new NotFound('Params["groupId"] must be valid');
					}

					if(groupWithUser['userId'] === null) {
						throw new Unauthorized('User must be in group');
					}

					return transaction.selectFrom('post')
						.innerJoin('user', 'post.user_id', 'user.id')
						.innerJoin('media', 'user.media_id', 'media.id')
						.select([
							'post.id',
							'post.content',
							'post.created_at as createdAt',
							'post.is_notice as isNotice',
							'user.id as userId',
							'user.name',
							'user.media_id as mediaId', 
							'media.hash',
							'media.type',
						])
						.where('post.group_id', '=', request['params']['groupId'])
						.where('post.deleted_at', 'is', null)
						.$if(typeof request['query']['index'] === 'number', function (queryBuilder: SelectQueryBuilder<Database, 'post' | 'user' | 'media', Pick<Post & User & Media, 'id' | 'content' | 'createdAt' | 'isNotice' | 'userId' | 'name' | 'mediaId' | 'hash' | 'type'>>): typeof queryBuilder {
							return queryBuilder.where('post.id', '<', request['query']['index'] as number);
						}) 
						.orderBy('post.id', 'desc')
						.limit(request['query']['size'])
						.execute();
				})
				.then(function (_posts: Pick<Post & User & Media, 'id' | 'content' | 'createdAt' | 'isNotice' | 'userId' | 'name' | 'mediaId' | 'hash' | 'type'>[]): Promise<(Pick<PostReaction, 'postId' | 'emoji'> & {
					count: number;
					isReacted: boolean;
				})[]> {
					const postIds: number[] = [];

					for (let i: number = 0; i < _posts['length']; i++) {
						postIds.push(_posts[i]['id']);
						posts.push({
							id: _posts[i]['id'],
							content: _posts[i]['content'],
							createdAt: _posts[i]['createdAt'],
							isNotice: _posts[i]['isNotice'],
							reactionCounts: (new Array(Emojis['CRY'])).fill(0),
							user: {
								id: _posts[i]['userId'],
								name: _posts[i]['name'],
								media: {
									id: _posts[i]['mediaId'],
									hash: _posts[i]['hash'],
									type: _posts[i]['type'],
								}
							},
						});
					}

					return transaction.selectFrom('post_reaction')
						.select([
							'post_id as postId',
							'emoji',
							kysely.fn.countAll<number>().as('count'),
							// needs type casting
							sql<boolean>`max((user_id = ${request['userId']})::integer)::boolean`.as('isReacted')
						])
						.where('post_id', 'in', postIds)
						.groupBy([
							'post_id',
							'emoji'
						])
						.orderBy('post_id', 'desc')
						.execute();
				})
				.then(function (postReactions: (Pick<PostReaction, 'postId' | 'emoji'> & {
					count: number;
					isReacted: boolean;
				})[]): void {
					for(let i: number = 0, j: number = 0; i < postReactions['length']; i++) {
						if(i !== 0 && postReactions[i - 1]['postId'] !== postReactions[i]['postId']) {
							j++;
						}

						posts[j]['reactionCounts'][postReactions[i]['emoji'] - 1] = {
							count: postReactions[i]['count'],
							isReacted: postReactions[i]['isReacted']
						};
					}

					reply.send(posts);
				});
		});
}