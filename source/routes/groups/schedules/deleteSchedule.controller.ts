import { kysely } from '@library/database';
import { NotFound, Unauthorized } from '@library/httpError';
import { getTimestamp } from '@library/time';
import { Database, Group, Schedule } from '@library/type';
import { FastifyReply, FastifyRequest } from 'fastify';
import { JoinBuilder, Transaction, UpdateResult } from 'kysely';

export default function (request: FastifyRequest<{
	Params: {
		groupId: Schedule['groupId'];
		scheduleId: Schedule['id'];
	};
}>, reply: FastifyReply): Promise<void> {
	return kysely.transaction()
		.setAccessMode('read write')
		.setIsolationLevel('serializable')
		.execute(function (transaction: Transaction<Database>): Promise<void> {
			return transaction.selectFrom('group')
				.select('group.user_id as userId')
				.leftJoin('schedule', function (joinBuilder: JoinBuilder<Database, 'group' | 'schedule'>): typeof joinBuilder {
					return joinBuilder.onRef('group.id', '=', 'schedule.group_id')
						.on('schedule.deleted_at', 'is', null);
				})
				.select('schedule.id as scheduleId')
				.where('group.id', '=', request['params']['groupId'])
				.where('group.deleted_at', 'is', null)
				.executeTakeFirst()
				.then(function (groupWithSchedule?: Pick<Group, 'userId'> & {
					scheduleId: Schedule['id'] | null;
				}): Promise<UpdateResult> {
					if(groupWithSchedule === undefined) {
						throw new NotFound('Params["groupId"] must be valid');
					}

					if(groupWithSchedule['scheduleId'] === null) {
						throw new NotFound('Params["scheduleId"] must be valid');
					}

					if(groupWithSchedule['userId'] !== request['userId']) {
						throw new Unauthorized('User must be group owner');
					}

					return transaction.updateTable('schedule')
						.set({
							deleted_at: getTimestamp()
						})
						.where('id', '=', request['params']['scheduleId'])
						.executeTakeFirstOrThrow();
				})
				.then(function (): void {
					reply.status(204)
						.send();
				});
		});
}