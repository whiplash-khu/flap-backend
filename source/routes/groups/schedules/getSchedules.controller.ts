import { kysely } from '@library/database';
import { NotFound, Unauthorized } from '@library/httpError';
import { Database, Calender, GroupUser, Schedule } from '@library/type';
import { getCalender } from '@library/time';
import { FastifyReply, FastifyRequest } from 'fastify';
import { JoinBuilder, Nullable, sql, Transaction } from 'kysely';

export default function (request: FastifyRequest<{
	Params: {
		groupId: Schedule['groupId'];
	};
	Querystring: {
		year: number;
		month: number;
	};
}>, reply: FastifyReply): Promise<void> {
	return kysely.transaction()
		.setAccessMode('read only')
		.setIsolationLevel('repeatable read')
		.execute(function (transaction: Transaction<Database>): Promise<void> {
			const calender: Calender = getCalender(request['query']['year'], request['query']['month']);

			return transaction.selectFrom('group')
				.leftJoin('group_user', function (joinBuilder: JoinBuilder<Database, 'group' | 'group_user'>): typeof joinBuilder {
					return joinBuilder.onRef('group.id', '=', 'group_user.group_id')
						.on('group_user.user_id', '=', request['userId']);
				})
				.select('group_user.user_id as userId')
				.where('group.id', '=', request['params']['groupId'])
				.where('group.deleted_at', 'is', null)
				.executeTakeFirst()
				.then(function (groupWithUser?: Nullable<Pick<GroupUser, 'userId'>>): Promise<Pick<Schedule, 'id' | 'name' | 'startAt' | 'endAt' | 'place'>[]> {
					if(groupWithUser === undefined) {
						throw new NotFound('Params["groupId"] must be valid');
					}

					if(groupWithUser['userId'] === null) {
						throw new Unauthorized('User must be in group');
					}

					const calenderLength: number = calender['startingDay'] + calender['length'] <= 35 ? 36 : 43;

					return transaction.selectFrom('schedule')
						.select([
							'id',
							'name',
							'start_at as startAt',
							'end_at as endAt',
							'place'
						])
						.where('group_id', '=', request['params']['groupId'])
						// first day of month - day of week = start of calender
						.where('start_at', '>=', sql<Date>`${request['query']['year'] + '-' + request['query']['month'] + '-1'}::timestamp with time zone - ${calender['startingDay'] + ' day'}::interval`)
						// last day of month + (calender length - month length - day of week) = end of calender
						.where('end_at', '<=', sql<Date>`${request['query']['year'] + '-' + request['query']['month'] + '-' + calender['length']}::timestamp with time zone + ${calenderLength - calender['startingDay'] - calender['length'] + ' day'}::interval`)
						.orderBy('start_at')
						.orderBy('end_at')
						.execute();
				})
				.then(function (schedules: Pick<Schedule, 'id' | 'name' | 'startAt' | 'endAt' | 'place'>[]): void {
					reply.send(schedules);
				});
		});
}