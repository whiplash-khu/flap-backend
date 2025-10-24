import { FastifyReply, FastifyRequest } from 'fastify';
import { JoinBuilder, Transaction, UpdateResult } from 'kysely';
import { encryptAes } from '@library/crypto';
import { kysely } from '@library/database';
import { NotFound, Unauthorized } from '@library/httpError';
import { Database, Fee, Group } from '@library/type';
import { getTimestamp } from '@library/time';

export default function (request: FastifyRequest<{
	Params: {
		groupId: Group['id'];
		feeId: Fee['id'];
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

					return transaction.updateTable('fee')
						.set({
							deleted_at: getTimestamp()
						})
						.where('id', '=', request['params']['feeId'])
						.executeTakeFirstOrThrow();
				})
				.then(function (): void {
					reply.status(204)
						.send();
				});
		});
}