import Module from '@library/module';
import S from 'fluent-json-schema';
import postPostReactionsController from './postPostReactions';
import deletePostReactionController from './deletePostReaction';
import postSchema from '@schemas/post';
import postReactionSchema from '@schemas/postReaction';

export default new Module(':groupId/posts/:postId', [
    {
        method: 'POST',
        url: 'reactions',
        handler: postPostReactionsController,
        schema: {
            params: S.object()
                .prop('groupId', postSchema['groupId'].required())
                .prop('postId', postReactionSchema['postId'].required()),
            body: S.object()
                .prop('emoji', postReactionSchema['emoji'].required())
        }
    },
    {
        method: 'DELETE',
        url: 'reactions/:emojiId',
        handler: deletePostReactionController,
        schema: {
            params: S.object()
                .prop('groupId', postSchema['groupId'].required())
                .prop('postId', postReactionSchema['postId'].required())
                .prop('emojiId', postReactionSchema['emoji'].required())
        }
    }
]);

