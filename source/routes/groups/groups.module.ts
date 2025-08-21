import Module from '@library/module';
import postGroupsController from './postGroups.controller';
import S from 'fluent-json-schema';
import groupSchema from '@schemas/group';
import groupQuestionSchema from '@schemas/groupQuestion';
import pagenationSchema from '@schemas/pagenation'
import getGroupsController from './getGroups.controller';
import getGroupController from './getGroup.controller';
import patchGroupController from './patchGroup.controller';
import deleteGroupController from './deleteGroup.controller';
import postsModule from './posts/posts.module';
import groupUsersModule from './users/groupUsers.module';

export default new Module('groups', [
	{
		method: 'POST',
		url: '',
		handler: postGroupsController,
		schema: {
			body: S.object()
				.prop('name', groupSchema['name'].required())
				.prop('introduction', groupSchema['introduction'].required())
				.prop('description', groupSchema['description'].required())
				.prop('startAt', groupSchema['startAt'].required())
				.prop('endAt', groupSchema['endAt'].required())
				.prop('mediaId', groupSchema['mediaId'])
				.prop('questions', S.array()
					.items(groupQuestionSchema['content'])
					.minItems(1)
					.uniqueItems(true)
					.required())
		}
	},
	{
		method: 'GET',
		url: '',
		handler: getGroupsController,
		schema: {
			querystring: S.object()
				.prop('index', pagenationSchema['index'])
				.prop('size', pagenationSchema['size'])
		}
	},
	{
		method: 'GET',
		url: ':groupId',
		handler: getGroupController,
		schema: {
			params: S.object()
				.prop('groupId', groupSchema['id'].required())
		}
	},
	{
		method: 'PATCH',
		url: ':groupId',
		handler: patchGroupController,
		schema: {
			params: S.object()
				.prop('groupId', groupSchema['id'].required()),
			body: S.object()
				.prop('name', groupSchema['name'])
				.prop('introduction', groupSchema['introduction'])
				.prop('description', groupSchema['description'])
				.prop('endAt', groupSchema['endAt'])
				.prop('mediaId', groupSchema['mediaId'])
				.anyOf([
					S.object()
						.required(['name']),
					S.object()
						.required(['introduction']),
					S.object()
						.required(['description']),
					S.object()
						.required(['endAt']),
					S.object()
						.required(['mediaId']),
				])
		}
	},
	{
		method: 'DELETE',
		url: ':groupId',
		handler: deleteGroupController,
		schema: {
			params: S.object()
				.prop('groupId', groupSchema['id'].required())
		}
	}
], [postsModule, groupUsersModule]);