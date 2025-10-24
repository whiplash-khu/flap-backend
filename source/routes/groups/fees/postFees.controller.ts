import { FastifyReply, FastifyRequest } from 'fastify';
import { Transaction } from 'kysely';
import { encryptAes } from '@library/crypto';
import { kysely } from '@library/database';
import { NotFound, Unauthorized } from '@library/httpError';
import { Database, Fee, Group, GroupUser } from '@library/type';
import { sockets } from '@library/websocket';
import { EventTypes } from '@library/constant';

export default function (request: FastifyRequest<{
		Params: {
			groupId: Group['id'];
		};
		Body: Pick<Fee, 'name' | 'bank' | 'account' | 'amount' | 'endAt'>;
}>, reply: FastifyReply): Promise<void> {
	return kysely.transaction()
		.setAccessMode('read write')
		.setIsolationLevel('serializable')
		.execute(function (transaction: Transaction<Database>): Promise<void> {
			let fee: Pick<Fee, 'id'>;

			return transaction.selectFrom('group')
				.select('user_id as userId')
				.where('id', '=', request['params']['groupId'])
				.where('deleted_at', 'is', null)
				.executeTakeFirst()
				.then(function (group?: Pick<Group, 'userId'>): Promise<Pick<Fee, 'id'>> {
					if(group === undefined) {
						throw new NotFound('Params["groupId"] must be valid');
					}

					if(group['userId'] !== request['userId']) {
						throw new Unauthorized('User must be group owner');
					}

					return transaction.insertInto('fee')
						.values({
							group_id: request['params']['groupId'],
							name: request['body']['name'],
							bank: request['body']['bank'],
							account: encryptAes(request['body']['account']),
							amount: request['body']['amount'],
							end_at: request['body']['endAt']
						})
						.returning('id')
						.executeTakeFirstOrThrow();
				})
				.then(function (_fee: Pick<Fee, 'id'>): Promise<Pick<GroupUser, 'userId'>[]> {
					fee = _fee;

					return transaction.selectFrom('group_user')
						.innerJoin('user', 'group_user.user_id', 'user.id')
						.select('group_user.user_id as userId')
						.where('group_user.id', '=', request['params']['groupId'])
						.where('group_user.user_id', '!=', request['userId'])
						.where('user.deleted_at', 'is', null)
						.execute();
				})
				.then(function (groupUsers: Pick<GroupUser, 'userId'>[]): void {
					sockets.send(groupUsers, {
						type: EventTypes['CREATE_FEE'],
						data: fee
					});

					reply.send(fee);
				});
		});
}