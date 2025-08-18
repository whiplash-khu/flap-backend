import { kysely } from '@library/database';
import { Unauthorized } from '@library/httpError';
import { Database, User } from '@library/type';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Transaction, UpdateResult } from 'kysely';

export default function (request: FastifyRequest<{
	Params: {
		userId: User['id'];
	};
}>, reply: FastifyReply): Promise<void> {
	if(request['userId'] !== request['params']['userId']) {
		throw new Unauthorized('Params["userId"] must be yourself');
	}

	return kysely.transaction()
		.setAccessMode('read write')
		.setIsolationLevel('serializable')
		.execute(function (transaction: Transaction<Database>): Promise<void> {
			const now: Date = new Date();

			return Promise.all([
				transaction.updateTable('group')
					.set({
						deleted_at: now
					})
					.where('user_id', '=', request['params']['userId'])
					.executeTakeFirstOrThrow(),
				transaction.updateTable('user')
					.set({
						deleted_at: now
					})
					.where('id', '=', request['params']['userId'])
					.executeTakeFirstOrThrow()
			])
				.then(function (): void {
					reply.status(204)
						.send();
				});
		});
}