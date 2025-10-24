import { EventTypes, ScheduleAttendanceStatus } from '@library/constant';
import { kysely } from '@library/database';
import { BadRequest, NotFound, Unauthorized } from '@library/httpError';
import { getTimestamp, parseTime } from '@library/time';
import { Database, Group, Schedule, ScheduleAttendance } from '@library/type';
import { sockets } from '@library/websocket';
import { FastifyReply, FastifyRequest } from 'fastify';
import { ExpressionBuilder, InsertResult, RawBuilder, SelectQueryBuilder, sql, Transaction } from 'kysely';

export default function (request: FastifyRequest<{
	Params: {
		groupId: Group['id'];
	};
	Body: Pick<Schedule, 'name' | 'address' | 'description'> & Record<'startAt' | 'endAt', number>;
}>, reply: FastifyReply): Promise<void> {
	request['body']['startAt'] = parseTime(request['body']['startAt'] as unknown as string);
	request['body']['endAt'] = parseTime(request['body']['endAt'] as unknown as string);

	const startAtTimestamp: RawBuilder<Date> = getTimestamp(request['body']['startAt']);
	const endAtTimestamp: RawBuilder<Date> = getTimestamp(request['body']['endAt']);

	return kysely.transaction()
		.setAccessMode('read write')
		.setIsolationLevel('serializable')
		.execute(function (transaction: Transaction<Database>): Promise<void> {
			let schedule: Pick<Schedule, 'id'>;

			return transaction.selectFrom('group')
				.select('user_id as userId')
				.where('id', '=', request['params']['groupId'])
				.where('deleted_at', 'is', null)
				.executeTakeFirst()
				.then(function (group?: Pick<Group, 'userId'>): Promise<{} | undefined> {
					if(group === undefined) {
						throw new NotFound('Params["groupId"] must be valid');
					}

					if(group['userId'] !== request['userId']) {
						throw new Unauthorized('User must be group owner');
					}

					if(request['body']['startAt'] > request['body']['endAt']) {
						throw new BadRequest('Body["startAt"] must be earlier than body["endAt"]');
					}

					return transaction.selectFrom('schedule')
						.where('start_at', '<', endAtTimestamp)
						.where('end_at', '>', startAtTimestamp)
						.where('group_id', '=', request['params']['groupId'])
						.where('deleted_at', 'is', null)
						.limit(1)
						.executeTakeFirst();
				})
				.then(function (schedule?: {}): Promise<Pick<Schedule, 'id'>> {
					if(schedule !== undefined) {
						throw new BadRequest('Body["startAt"] and body["endAt"] must not overlap other schedule');
					}

					return transaction.insertInto('schedule')
						.values({
							group_id: request['params']['groupId'],
							name: request['body']['name'],
							start_at: startAtTimestamp,
							end_at: endAtTimestamp,
							address: request['body']['address'],
							description: request['body']['description']
						})
						.returning('id')
						.executeTakeFirstOrThrow();
				})
				.then(function (_schedule: Pick<Schedule, 'id'>): Promise<Pick<ScheduleAttendance, 'userId'>[]> {
					schedule = _schedule;

					return transaction.insertInto('schedule_attendance')
						.columns([
							'schedule_id',
							'user_id',
							'status'
						])
						.expression(function (epxressionBuilder: ExpressionBuilder<Database, 'schedule_attendance'>): SelectQueryBuilder<Database, 'user' | 'group_user', Omit<ScheduleAttendance, 'id'>> {
							return epxressionBuilder.selectFrom('user')
								.select([
									sql.lit(_schedule['id']).as('scheduleId'),
									'user.id as userId',
									sql.lit(ScheduleAttendanceStatus['ABSENT']).as('status')
								])
								.where('user.deleted_at', 'is', null)
								.innerJoin('group_user', 'user.id', 'group_user.user_id')
								.where('group_user.group_id', '=', request['params']['groupId']);
						})
						.returning('user_id as userId')
						.execute();
				})
				.then(function (scheduleAttendances: Pick<ScheduleAttendance, 'userId'>[]): void {
					for(let i: number = 0; i < scheduleAttendances['length']; i++) {
						if(scheduleAttendances[i]['userId'] === request['userId']) {
							scheduleAttendances.splice(i);

							break;
						}
					}

					sockets.send(scheduleAttendances, {
						type: EventTypes['CREATE_SCHEDULE'],
						data: schedule
					});

					reply.status(201)
						.header('location', '/groups/' + request['params']['groupId'] + '/schedules/' + schedule['id'])
						.send(schedule);
				});
		});
}