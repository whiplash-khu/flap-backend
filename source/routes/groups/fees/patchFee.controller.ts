import { FastifyReply, FastifyRequest } from 'fastify';
import { JoinBuilder, Transaction, UpdateResult } from 'kysely';
import { encryptAes } from '@library/crypto';
import { kysely } from '@library/database';
import { NotFound, Unauthorized } from '@library/httpError';
import { Database, Fee, Group } from '@library/type';

export default function (request: FastifyRequest<{
	Params: {
		groupId: Group['id'];
		feeId: Fee['id'];
	};
	Body: Partial<Pick<Fee, 'name' | 'bank' | 'account' | 'amount' | 'endAt'>>;
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
				}): Promise<UpdateResult> {
					if(groupWithFee === undefined) {
						throw new NotFound('Params["groupId"] must be valid');
					}

					if(groupWithFee['feeId'] === null) {
						throw new NotFound('Params["feeId"] must be valid');
					}

					if(groupWithFee['userId'] !== request['userId']) {
						throw new Unauthorized('User must be group owner');
					}

					let account: string | undefined;

					if(typeof request['body']['account'] === 'string') {
						account = encryptAes(request['body']['account']);
					}
					
					return transaction.updateTable('fee')
						.set({
							name: request['body']['name'],
							bank: request['body']['bank'],
							account: account,
							amount: request['body']['amount'],
							end_at: request['body']['endAt']
						})
						.where('id', '=', request['params']['feeId'])
						.executeTakeFirstOrThrow();
				})
				.then(function (): void {
					reply.send({
						name: request['body']['name'],
						account: request['body']['account'],
						amount: request['body']['amount'],
						end_at: request['body']['endAt']
					});
				});
		});
}