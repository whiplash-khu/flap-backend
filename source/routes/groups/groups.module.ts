import Module from '@library/module';
import postGroupsController from './postGroups.controller';
import S from 'fluent-json-schema';
import groupSchema from '@schemas/group';
import groupQuestionSchema from '@schemas/groupQuestion';
import pagenationSchema from '@schemas/pagenation'
import getGroupsController from './getGroups.controller';

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
	}
]);