import { kysely } from '@library/database';
import { NotFound, Unauthorized } from '@library/httpError';
import { Database, Fee, FeeSubmission, Group } from '@library/type';
import { FastifyReply, FastifyRequest } from 'fastify';
import { DeleteResult, JoinBuilder, Nullable, Transaction } from 'kysely';

export default function (request: FastifyRequest<{
	Params: {
		groupId: Group['id'];
		feeId: Fee['id'];
		submissionId: FeeSubmission['id'];
	};
}>, reply: FastifyReply): Promise<void> {
	return kysely.transaction()
		.setAccessMode('read only')
		.setIsolationLevel('serializable')
		.execute(function (transaction: Transaction<Database>): Promise<void> {
			return transaction.selectFrom('group')
				.select('group.user_id as userId')
				.where('group.id', '=', request['params']['groupId'])
				.where('group.deleted_at', 'is', null)
				.leftJoin('fee', function (joinBuilder: JoinBuilder<Database, 'group' | 'fee'>): typeof joinBuilder {
					return joinBuilder.onRef('group.id', '=', 'fee.group_id')
						.on('fee.id', '=', request['params']['feeId'])
						.on('fee.deleted_at', 'is', null);
				})
				.select('fee.id as feeId')
				.leftJoin('fee_submission', function (joinBuilder: JoinBuilder<Database, 'group' | 'fee' | 'fee_submission'>): typeof joinBuilder {
					return joinBuilder.onRef('fee.id', '=', 'fee_submission.fee_id')
						.on('fee_submission.id', '=', request['params']['submissionId']);
				})
				.select('fee_submission.id as submissionId')
				.executeTakeFirst()
				.then(function (groupWithFeeAndSubmission?: Pick<Group, 'userId'> & Nullable<{
					feeId: Fee['id'];
					submissionId: FeeSubmission['id'];
				}>): Promise<DeleteResult> {
					if(groupWithFeeAndSubmission === undefined) {
						throw new NotFound('Params["groupId"] must be valid');
					}

					if(groupWithFeeAndSubmission['feeId'] === null) {
						throw new NotFound('Params["feeId"] must be valid');
					}

					if(groupWithFeeAndSubmission['submissionId'] === null) {
						throw new NotFound('Params["submissionId"] must be valid');
					}

					if(groupWithFeeAndSubmission['userId'] !== request['userId']) {
						throw new Unauthorized('User must be group owner');
					}

					return transaction.deleteFrom('fee_submission')
						.where('id', '=', request['params']['submissionId'])
						.executeTakeFirstOrThrow();
				})
				.then(function (): void {
					reply.status(204)
						.send();
				});
		});
}