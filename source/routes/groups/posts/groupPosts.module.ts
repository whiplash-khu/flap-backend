import Module from '@library/module';
import S from 'fluent-json-schema';
import postPostsController from './postPosts.controller';
import getPostsController from './getPosts.controller';
import getPostController from './getPost.controller';
import patchPostController from './patchPost.controller';
import deletePostController from './deletePost.controller';
import postSchema from '@schemas/post';
import pagenationSchema from '@schemas/pagenation';

export default new Module(':groupId/posts', [
	{
		method: 'POST',
		url: '',
		handler: postPostsController,
		schema: {
			params: S.object()
				.prop('groupId', postSchema['groupId'].required()),
			body: S.object()
				.prop('content', postSchema['content'].required())
				.prop('isNotice', postSchema['isNotice'].required())
		}
	},
	{
		method: 'GET',
		url: '',
		handler: getPostsController,
		schema: {
			params: S.object()
				.prop('groupId', postSchema['groupId'].required()),
			querystring: S.object()
				.prop('index', pagenationSchema['index'])
				.prop('size', pagenationSchema['size'])
		}
	},
	{
		method: 'GET',
		url: ':postId',
		handler: getPostController,
		schema: {
			params: S.object()
				.prop('groupId', postSchema['groupId'].required())
				.prop('postId', postSchema['id'].required())
		}
	},
	{
		method: 'PATCH',
		url: ':postId',
		handler: patchPostController,
		schema: {
			params: S.object()
				.prop('groupId', postSchema['groupId'].required())
				.prop('postId', postSchema['id'].required()),
			body: S.object()
				.prop('content', postSchema['content'].required())
				.prop('isNotice', postSchema['isNotice'].required())
				.anyOf([
					S.object()
						.required(['content']),
					S.object()
						.required(['isNotice'])
				])
		}
	},
	{
		method: 'DELETE',
		url: ':postId',
		handler: deletePostController,
		schema: {
			params: S.object()
				.prop('groupId', postSchema['groupId'].required())
				.prop('postId', postSchema['id'].required())
		}
	}
]);

