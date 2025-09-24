import { FastifyReply, FastifyRequest } from 'fastify';
import { JoinBuilder, Nullable, SelectQueryBuilder, Transaction } from 'kysely';
import { getOperator, kysely } from '@library/database';
import { NotFound, Unauthorized } from '@library/httpError';
import { Database, Fee, FeeSubmission, FeeSubmissionTable, Group, Pagenation, User } from '@library/type';

export default function (request: FastifyRequest<{
	Params: {
		groupId: Group['id'];
		feeId: Fee['id'];
	};
	Querystring: Pagenation;
}>, reply: FastifyReply): Promise<void> {
	return kysely.transaction()
		.setAccessMode('read only')
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
				.where('group.id', '=', request['params']['groupId'])
				.where('group.deleted_at', 'is', null)
				.executeTakeFirst()
				.then(function (groupWithFee?: Pick<Group, 'userId'> & {
					feeId: Fee['id'] | null;
				}): Promise<(Pick<User, 'id' | 'name'> & Nullable<{
					submissionId: FeeSubmission['id'];
					createdAt: FeeSubmission['createdAt'];
				}>)[]> {
					if(groupWithFee === undefined) {
						throw new NotFound('Params["groupId"] must be valid');
					}

					if(groupWithFee['feeId'] === null) {
						throw new NotFound('Params["feeId"] must be valid');
					}

					if(groupWithFee['userId'] !== request['userId']) {
						throw new Unauthorized('User must be group owner');
					}

					return transaction.selectFrom('user')
						.select([
							'user.id',
							'user.name'
						])
						.where('user.deleted_at', 'is', null)
						.leftJoin('fee_submission', 'user.id', 'fee_submission.user_id')
						.select([
							'fee_submission.id as submissionId',
							'fee_submission.created_at as createdAt'
						])
						.where('fee_submission.fee_id', '=', request['params']['feeId'])
						.$if(typeof request['query']['index'] === 'number', function (queryBulder: SelectQueryBuilder<Omit<Database, 'fee_submission'> & {
							fee_submission: Nullable<FeeSubmissionTable>;
						}, 'user' | 'fee_submission', Pick<User, 'id' | 'name'> & Nullable<{
							submissionId: FeeSubmission['id'];
							createdAt: FeeSubmission['createdAt'];
						}>>): typeof queryBulder {
							return queryBulder.where('fee_submission.id', getOperator(request['query']), request['query']['index'] as number);
						})
						.limit(request['query']['size'])
						.execute();
				})
				.then(function (_userWithSubmissions: (Pick<User, 'id' | 'name'> & Nullable<{
					submissionId: FeeSubmission['id'];
					createdAt: FeeSubmission['createdAt'];
				}>)[]): void {
					const submissionWithUser: (Partial<Pick<FeeSubmission, 'id' | 'createdAt'>> & {
						user: Pick<User, 'id' | 'name'>;
					})[] = [];

					for(let i: number = 0; i < _userWithSubmissions['length']; i++) {
						submissionWithUser.push(Object.assign(_userWithSubmissions[i]['submissionId'] !== null ? {
							id: _userWithSubmissions[i]['submissionId'] as number,
							createdAt: _userWithSubmissions[i]['createdAt'] as Date
						} : {}, {
							user: {
								id: _userWithSubmissions[i]['id'],
								name: _userWithSubmissions[i]['name']
							}
						}));
					}

					reply.send(submissionWithUser);
				});
		});
}