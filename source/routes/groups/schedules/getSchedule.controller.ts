import { kysely } from '@library/database';
import { NotFound, Unauthorized } from '@library/httpError';
import { Database, GroupUser, Schedule } from '@library/type';
import { FastifyReply, FastifyRequest } from 'fastify';
import { JoinBuilder, Nullable, Transaction } from 'kysely';

export default function (request: FastifyRequest<{
	Params: {
		groupId: Schedule['groupId'];
		scheduleId: Schedule['id'];
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
				.then(function (groupWithUser?: Nullable<Pick<GroupUser, 'userId'>>): Promise<Pick<Schedule, 'name' | 'startAt' | 'endAt' | 'address' | 'place' | 'description'> | undefined> {
					if(groupWithUser === undefined) {
						throw new NotFound('Params["groupId"] must be valid');
					}

					if(groupWithUser['userId'] === null) {
						throw new Unauthorized('User must be in group');
					}

					return transaction.selectFrom('schedule')
						.select([
							'name',
							'start_at as startAt',
							'end_at as endAt',
							'address',
							'place',
							'description'
						])
						.where('group_id', '=', request['params']['groupId'])
						.where('id', '=', request['params']['scheduleId'])
						.executeTakeFirst();
				})
				.then(function (schedule?: Pick<Schedule, 'name' | 'startAt' | 'endAt' | 'address' | 'place' | 'description'>): void {
					if(schedule === undefined) {
						throw new NotFound('Params["scheduleId"] must be valid');
					}

					reply.send(Object.assign({
						id: request['params']['scheduleId']
					}, schedule));
				});
		});
}