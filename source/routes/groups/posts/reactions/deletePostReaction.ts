import { getEmojiName, kysely } from '@library/database';
import { NotFound, Unauthorized, BadRequest } from '@library/httpError';
import { Post, Database, GroupUser, PostReaction } from '@library/type';
import { FastifyReply, FastifyRequest } from 'fastify';
import { DeleteResult, JoinBuilder, Nullable, Transaction } from 'kysely';

export default function (request: FastifyRequest<{
    Params: {
        groupId: Post['groupId'];
        postId: PostReaction['postId'];
        emojiId: PostReaction['emoji'];
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

                    return transaction.selectFrom('post')
                        .select('post.id')
                        .where('post.group_id', '=', request['params']['groupId'])
                        .where('post.id', '=', request['params']['postId'])
                        .where('post.deleted_at', 'is', null)
                        .executeTakeFirstOrThrow();
                })
                .then((function () {
                    const emoji = getEmojiName(Number.parseInt(request['params']['emojiId'])); 
                        if(typeof emoji !== 'string') { 
                            throw new BadRequest('Params["emojiId"] must be valid');
                        }
                        return emoji;
                }))
                .then((emoji: string):Promise<DeleteResult[]> => {
                    return transaction.deleteFrom('post_reaction')
                        .where('post_reaction.post_id', '=', request['params']['postId'])
                        .where('post_reaction.user_id', '=', request['userId'])
                        .where('post_reaction.emoji', '=', emoji)
                        .execute();
                    })
                .then(() => {
                    reply.status(204)
                        .send();
                });
        });
}