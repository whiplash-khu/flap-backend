import { FastifyReply, FastifyRequest } from 'fastify';
import { JoinBuilder, Nullable, SelectQueryBuilder, Transaction } from 'kysely';
import { decryptAes } from '@library/crypto';
import { getOperator, kysely } from '@library/database';
import { NotFound, Unauthorized } from '@library/httpError';
import { getTimestamp } from '@library/time';
import { Database, Fee, FeeSubmission, FeeSubmissionTable, Group, GroupUser, Pagenation } from '@library/type';

export default function (request: FastifyRequest<{
	Params: {
		groupId: Group['id'];
	};
	Querystring: Pagenation & {
		isUnpaid?: boolean;
		isOverdue?: boolean;
	};
}>, reply: FastifyReply): Promise<void> {
	return kysely.transaction()
		.setAccessMode('read only')
		.setIsolationLevel('repeatable read')
		.execute(function (transaction: Transaction<Database>): Promise<void> {
			return transaction.selectFrom('group')
				.leftJoin('group_user', function (joinBuilder: JoinBuilder<Database, 'group' | 'group_user'>): typeof joinBuilder {
					return joinBuilder.onRef('group.id', '=', 'group_user.group_id')
						.on('group_user.user_id', '=', request['userId']);
				})
				.select('group_user.user_id as userId')
				.where('group.id', '=', request['params']['groupId'])
				.where('group.deleted_at', 'is', null)
				.executeTakeFirst()
				.then(function (groupWithUser?: Nullable<Pick<GroupUser, 'userId'>>): Promise<(Pick<Fee, 'id' | 'name' | 'bank' | 'account' | 'amount' | 'endAt'> & Nullable<{
					submissionId: FeeSubmission['id'];
					createdAt: FeeSubmission['createdAt'];
				}>)[]> {
					if(groupWithUser === undefined) {
						throw new NotFound('Params["groupId"] must be valid');
					}

					if(groupWithUser['userId'] === null) {
						throw new Unauthorized('User must be in group');
					}

					return transaction.selectFrom('fee')
						.select([
							'fee.id',
							'fee.name',
							'fee.bank',
							'fee.account',
							'fee.amount',
							'fee.end_at as endAt'
						])
						.where('fee.deleted_at', 'is', null)
						.leftJoin('fee_submission', function (joinBuilder: JoinBuilder<Database, 'fee' | 'fee_submission'>): typeof joinBuilder {
							return joinBuilder.onRef('fee.id', '=', 'fee_submission.fee_id')
								.on('fee_submission.user_id', '=', request['userId']);
						})
						.select([
							'fee_submission.id as submissionId',
							'fee_submission.created_at as createdAt'
						])
						.$if(typeof request['query']['isUnpaid'] === 'boolean', function (queryBulder: SelectQueryBuilder<Omit<Database, 'fee_submission'> & {
							fee_submission: Nullable<FeeSubmissionTable>;
						}, 'fee' | 'fee_submission', Pick<Fee, 'id' | 'name' | 'bank' | 'account' | 'amount' | 'endAt'> & Nullable<{
							submissionId: FeeSubmission['id'];
							createdAt: FeeSubmission['createdAt'];
						}>>): typeof queryBulder {
							return queryBulder.where('fee_submission.id', request['query']['isUnpaid'] ? 'is' : 'is not', null);
						})
						.$if(typeof request['query']['isOverdue'] === 'boolean', function (queryBulder: SelectQueryBuilder<Omit<Database, 'fee_submission'> & {
							fee_submission: Nullable<FeeSubmissionTable>;
						}, 'fee' | 'fee_submission', Pick<Fee, 'id' | 'name' | 'bank' | 'account' | 'amount' | 'endAt'> & Nullable<{
							submissionId: FeeSubmission['id'];
							createdAt: FeeSubmission['createdAt'];
						}>>): typeof queryBulder {
							return queryBulder.where('fee.end_at', request['query']['isOverdue'] ? '<' : '>=', getTimestamp());
						})
						.$if(typeof request['query']['index'] === 'number', function (queryBulder: SelectQueryBuilder<Omit<Database, 'fee_submission'> & {
							fee_submission: Nullable<FeeSubmissionTable>;
						}, 'fee' | 'fee_submission', Pick<Fee, 'id' | 'name' | 'bank' | 'account' | 'amount' | 'endAt'> & Nullable<{
							submissionId: FeeSubmission['id'];
							createdAt: FeeSubmission['createdAt'];
						}>>): typeof queryBulder {
							return queryBulder.where('fee.id', getOperator(request['query']), request['query']['index'] as number);
						})
						.limit(request['query']['size'])
						.execute();
				})
				.then(function (_feeWithSubmissions: (Pick<Fee, 'id' | 'name' | 'bank' | 'account' | 'amount' | 'endAt'> & Nullable<{
					submissionId: FeeSubmission['id'];
					createdAt: FeeSubmission['createdAt'];
				}>)[]): void {
					const feeWithSubmissions: (Pick<Fee, 'id' | 'name' | 'bank' | 'account' | 'amount' | 'endAt'> & {
						submission?: Pick<FeeSubmission, 'id' | 'createdAt'>;
					})[] = [];

					for(let i: number = 0; i < _feeWithSubmissions['length']; i++) {
						feeWithSubmissions.push(Object.assign({
							id: _feeWithSubmissions[i]['id'],
							name: _feeWithSubmissions[i]['name'],
							bank: _feeWithSubmissions[i]['bank'],
							account: decryptAes(_feeWithSubmissions[i]['account']),
							amount: _feeWithSubmissions[i]['amount'],
							endAt: _feeWithSubmissions[i]['endAt']
						}, _feeWithSubmissions[i]['submissionId'] !== null ? {
							submission: {
								id: _feeWithSubmissions[i]['submissionId'] as number,
								createdAt: _feeWithSubmissions[i]['createdAt'] as Date
							}
						} : undefined));
					}

					reply.send(feeWithSubmissions);
				});
		});
}