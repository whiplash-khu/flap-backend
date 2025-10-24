import S from 'fluent-json-schema';
import getFeesController from './getFees.controller';
import patchFeeController from './patchFee.controller';
import postFeesController from './postFees.controller';
import submissionsModule from './submissions/submissions.module';
import Module from '@library/module';
import feeSchema from '@schemas/fee';
import pagenationSchema from '@schemas/pagenation';
import deleteFeeController from './deleteFee.controller';

export default new Module(':groupId/fees', [
	{
		method: 'POST',
		url: '',
		handler: postFeesController,
		schema: {
			params: S.object()
				.prop('groupId', feeSchema['groupId'].required()),
			body: S.object()
				.prop('name', feeSchema['name'].required())
				.prop('bank', feeSchema['bank'].required())
				.prop('account', feeSchema['account'].required())
				.prop('amount', feeSchema['amount'].required())
				.prop('endAt', feeSchema['endAt'].required())
		}
	},
	{
		method: 'GET',
		url: '',
		handler: getFeesController,
		schema: {
			params: S.object()
				.prop('groupId', feeSchema['groupId'].required()),
			querystring: S.object()
				.prop('index', pagenationSchema['index'])
				.prop('size', pagenationSchema['size'])
				.prop('isUnpaid', S.boolean())
				.prop('isOverdue', S.boolean())
		}
	},
	{
		method: 'PATCH',
		url: ':feeId',
		handler: patchFeeController,
		schema: {
			params: S.object()
				.prop('groupId', feeSchema['groupId'].required())
				.prop('feeId', feeSchema['id'].required()),
			body: S.object()
				.prop('name', feeSchema['name'])
				.prop('bank', feeSchema['bank'])
				.prop('account', feeSchema['account'])
				.prop('amount', feeSchema['amount'])
				.prop('endAt', feeSchema['endAt'])
				.anyOf([
					S.object()
						.required(['name']),
					S.object()
						.required(['bank']),
					S.object()
						.required(['account']),
					S.object()
						.required(['amount']),
					S.object()
						.required(['endAt'])
				])
		}
	},
	{
		method: 'DELETE',
		url: ':feeId',
		handler: deleteFeeController,
		schema: {
			params: S.object()
				.prop('groupId', feeSchema['groupId'].required())
				.prop('feeId', feeSchema['id'].required())
		}
	}
], [submissionsModule]);