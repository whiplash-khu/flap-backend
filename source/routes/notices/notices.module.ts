import Module from '@library/module';
import S from 'fluent-json-schema';
import getNoticesController from './getNotices.controller';
import pagenationSchema from '@schemas/pagenation';

export default new Module('notices', [
	{
		method: 'GET',
		url: '',
		handler: getNoticesController,
		excludePreHandler: true,
		schema: {
			querystring: S.object()
				.prop('index', pagenationSchema['index'])
				.prop('size', pagenationSchema['size'])
		}
	}
]);

