import { FastifyReply, FastifyRequest } from 'fastify';
import { JoinBuilder, Nullable, Transaction } from 'kysely';
import { kysely } from '@library/database';
import { BadRequest, NotFound, Unauthorized } from '@library/httpError';
import { Database, Fee, FeeSubmission, Group, GroupUser, User } from '@library/type';

export default function (request: FastifyRequest<{
	Params: {
		groupId: Group['id'];
		feeId: Fee['id'];
	};
	Body: {
		userId: User['id'];
	};
}>, reply: FastifyReply): Promise<void> {
	return kysely.transaction()
		.setAccessMode('read write')
		.setIsolationLevel('serializable')
		.execute(function (transaction: Transaction<Database>): Promise<void> {
			return transaction.selectFrom('group')
				.select('group.user_id as userId')
				.leftJoin('fee', function (joinBuilder: JoinBuilder<Database, 'group' | 'fee'>): typeof joinBuilder {
					return joinBuilder.onRef('group.id', '=', 'fee.group_id')
						.on('fee.id', '=', request['params']['feeId'])
						.on('fee.deleted_at', 'is', null);
				})
				.select('fee.id as feeId')
				.leftJoin('group_user', function (joinBuilder: JoinBuilder<Database, 'group' | 'fee' | 'group_user'>): typeof joinBuilder {
					return joinBuilder.onRef('group.id', '=', 'group_user.group_id')
						.on('group_user.user_id', '=', request['body']['userId']);
				})
				.select('group_user.user_id as __userId')
				.leftJoin('user', function (joinBuilder: JoinBuilder<Database, 'group' | 'fee' | 'group_user' | 'user'>): typeof joinBuilder {
					return joinBuilder.onRef('group_user.user_id', '=', 'user.id')
						.on('user.deleted_at', 'is', null);
				})
				// check first
				.select('user.id as _userId')
				.where('group.id', '=', request['params']['groupId'])
				.where('group.deleted_at', 'is', null)
				.executeTakeFirst()
				.then(function (groupWithFeeAndUser?: Pick<Group, 'userId'> & Nullable<{
					feeId: Fee['id'];
					_userId: User['id'];
					__userId: GroupUser['id'];
				}>): Promise<Pick<FeeSubmission, 'id'>> {
					if(groupWithFeeAndUser === undefined) {
						throw new NotFound('Params["groupId"] must be valid');
					}

					if(groupWithFeeAndUser['feeId'] === null) {
						throw new NotFound('Params["feeId"] must be valid');
					}

					if(groupWithFeeAndUser['userId'] !== request['userId']) {
						throw new Unauthorized('User must be group owner');
					}

					if(groupWithFeeAndUser['_userId'] === null) {
						throw new BadRequest('Body["userId"] must be valid');
					}

					if(groupWithFeeAndUser['__userId'] === null) {
						throw new BadRequest('User with body["userId"] must be in group');
					}

					return transaction.insertInto('fee_submission')
						.values({
							fee_id: request['params']['feeId'],
							user_id: request['body']['userId']
						})
						.returning('id')
						.executeTakeFirstOrThrow();
				})
				.then(function (submission: Pick<FeeSubmission, 'id'>): void {
					reply.send(submission);
				});
		});
}