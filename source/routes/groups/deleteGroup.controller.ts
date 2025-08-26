import { kysely } from '@library/database';
import { NotFound, Unauthorized } from '@library/httpError';
import { getTimestamp } from '@library/time';
import { Database, Group } from '@library/type';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Transaction, UpdateResult } from 'kysely';

export default function (request: FastifyRequest<{
	Params: {
		groupId: Group['id'];
	};
}>, reply: FastifyReply): Promise<void> {
	return kysely.transaction()
		.setAccessMode('read write')
		.setIsolationLevel('serializable')
		.execute(function (transaction: Transaction<Database>): Promise<void> {
			return transaction.selectFrom('group')
				.select('user_id as userId')
				.where('id', '=', request['params']['groupId'])
				.where('deleted_at', 'is', null)
				.executeTakeFirst()
				.then(function (group?: Pick<Group, 'userId'>): Promise<UpdateResult> {
					if(group === undefined) {
						throw new NotFound('Params["groupId"] must be valid');
					}

					if(group['userId'] !== request['userId']) {
						throw new Unauthorized('Group["userId"] must be yourself');
					}

					return transaction.updateTable('group')
						.set({
							deleted_at: getTimestamp()
						})
						.where('id', '=', request['params']['groupId'])
						.executeTakeFirstOrThrow();
				})
				.then(function (): void {
					reply.status(204)
						.send();
				});
		});
}