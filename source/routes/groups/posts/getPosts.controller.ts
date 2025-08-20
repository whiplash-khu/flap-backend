import { kysely } from '@library/database';
import { NotFound, Unauthorized } from '@library/httpError';
import { Post, Database, Pagenation, User, Media } from '@library/type';
import { FastifyReply, FastifyRequest } from 'fastify';
import { JoinBuilder, Nullable, Transaction } from 'kysely';

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
                        .$if(typeof request['query']['index'] === 'number', function (queryBuilder)   {
                            return queryBuilder.where('post.id', '<', request['query']['index'] as number)
                        }) 
                        .orderBy('post.id', 'desc')
                        .limit(request['query']['size'])
                        .execute();
                })
                .then(function (_groupPosts: Pick<Post & User & Media, 'id' | 'content' | 'createdAt' | 'isNotice' | 'userId' | 'name' | 'mediaId' | 'hash' | 'type'>[]): Promise<void> {
                    const groupPosts: (Pick<Post, 'id' | 'content' | 'createdAt' | 'isNotice'> & {
                        user: Pick<User, 'id' | 'name'> & {
							media: Pick<Media, 'id' | 'hash' | 'type'>;
						};
                        reactions: Record<string, number>;
                    })[] = [];

                    const postIds: number[] = [];
                    const postId = new Map<number, number>();

                    for (let i = 0; i < _groupPosts.length; i++) {
                        groupPosts.push({
                            id: _groupPosts[i]['id'],
                            content: _groupPosts[i]['content'],
                            createdAt: _groupPosts[i]['createdAt'],
                            isNotice: _groupPosts[i]['isNotice'],
                            reactions: {},
                            user: {
                                id: _groupPosts[i]['userId'],
                                name: _groupPosts[i]['name'],
                                media: {
									id: _groupPosts[i]['mediaId'],
									hash: _groupPosts[i]['hash'],
									type: _groupPosts[i]['type'],
								}
                            },
                        });
                        postIds.push(_groupPosts[i]['id']);
                        postId.set(_groupPosts[i]['id'], i);
                    }
                    return transaction.selectFrom('post_reaction')
                        .select(['post_id as postId', 'emoji'])
                        .select(kysely.fn.countAll<number>().as('count'))
                        .where('post_id', 'in', postIds)
                        .groupBy(['post_id', 'emoji'])
                        .execute()
                        .then(function (emojis: { postId: number; emoji: string; count: number }[]): void {
                            for (let i = 0; i < emojis.length; i++) {
                                const _postId = postId.get(emojis[i]['postId']);
                                if (typeof _postId === 'number') {
                                    groupPosts[_postId]['reactions'][emojis[i]['emoji']] = emojis[i]['count'];
                                }
                            }
                            reply.send(groupPosts);
                        });
                });
        });
}