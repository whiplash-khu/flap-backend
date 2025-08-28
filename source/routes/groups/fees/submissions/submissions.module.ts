import Module from '@library/module';
import postSubmissionsController from './postSubmissions.controller';
import S from 'fluent-json-schema';
import feeSchema from '@schemas/fee';
import feeSubmissionSchema from '@schemas/feeSubmission';
import pagenationSchema from '@schemas/pagenation';
import getSubmissionsController from './getSubmissions.controller';
import deleteSubmissionController from './deleteSubmission.controller';

export default new Module(':feeId/submissions', [
	{
		method: 'POST',
		url: '',
		handler: postSubmissionsController,
		schema: {
			params: S.object()
				.prop('groupId', feeSchema['groupId'].required())
				.prop('feeId', feeSubmissionSchema['feeId'].required()),
			body: S.object()
				.prop('userId', feeSubmissionSchema['userId'].required())
		}
	},
	{
		method: 'GET',
		url: '',
		handler: getSubmissionsController,
		schema: {
			params: S.object()
				.prop('groupId', feeSchema['groupId'].required())
				.prop('feeId', feeSubmissionSchema['feeId'].required()),
			querystring: S.object()
				.prop('index', pagenationSchema['index'])
				.prop('size', pagenationSchema['size'])
		}
	},
	{
		method: 'DELETE',
		url: ':submissionId',
		handler: deleteSubmissionController,
		schema: {
			params: S.object()
				.prop('groupId', feeSchema['groupId'].required())
				.prop('feeId', feeSubmissionSchema['feeId'].required())
				.prop('submissionId', feeSubmissionSchema['id'].required())
		}
	}
]);