import Module from '@library/module';
import S from 'fluent-json-schema';
import postPostReactionsController from './postPostReactions.controller';
import deletePostReactionController from './deletePostReaction.controller';
import postSchema from '@schemas/post';
import postReactionSchema from '@schemas/postReaction';

export default new Module('reactions', [
	{
		method: 'POST',
		url: '',
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
		url: ':emoji',
		handler: deletePostReactionController,
		schema: {
			params: S.object()
				.prop('groupId', postSchema['groupId'].required())
				.prop('postId', postReactionSchema['postId'].required())
				.prop('emoji', postReactionSchema['emoji'].required())
		}
	}
]);

