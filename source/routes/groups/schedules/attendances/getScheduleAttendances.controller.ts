import { kysely } from '@library/database';
import { NotFound, Unauthorized } from '@library/httpError';
import { Database, Group, Pagenation, Schedule, ScheduleAttendance, User } from '@library/type';
import { FastifyReply, FastifyRequest } from 'fastify';
import { JoinBuilder, SelectQueryBuilder, Transaction } from 'kysely';

export default function (request: FastifyRequest<{
	Params: Pick<Schedule & ScheduleAttendance, 'groupId' | 'scheduleId'>;
	Querystring: Pagenation;
}>, reply: FastifyReply): Promise<void> {
	return kysely.transaction()
		.setAccessMode('read only')
		.setIsolationLevel('repeatable read')
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
				}): Promise<Pick<ScheduleAttendance & User, 'id' | 'userId' | 'status' | 'name'>[]> {
					if(groupWithSchedule === undefined) {
						throw new NotFound('Params["groupId"] must be valid');
					}

					if(groupWithSchedule['scheduleId'] === null) {
						throw new NotFound('Params["scheduleId"] must be valid');
					}

					if(groupWithSchedule['userId'] !== request['userId']) {
						throw new Unauthorized('User must be group owner');
					}

					return transaction.selectFrom('schedule_attendance')
						.select(['schedule_attendance.id', 'schedule_attendance.user_id as userId', 'schedule_attendance.status'])
						.innerJoin('user', 'schedule_attendance.user_id', 'user.id')
						.select(['user.name'])
						.where('schedule_id', '=', request['params']['scheduleId'])
						.$if(typeof request['query']['index'] === 'number', function (queryBulder: SelectQueryBuilder<Database, 'schedule_attendance' | 'user', Pick<ScheduleAttendance & User, 'id' | 'userId' | 'status' | 'name'>>): typeof queryBulder {
							return queryBulder.where('schedule_attendance.id', '<', request['query']['index'] as number);
						})
						.limit(request['query']['size'])
						.execute();
				})
				.then(function (_scheduleAttendanceWithUsers: Pick<ScheduleAttendance & User, 'id' | 'userId' | 'status' | 'name'>[]): void {
					const scheduleAttendanceWithUsers: (Pick<ScheduleAttendance, 'id' | 'status'> & {
						user: Pick<User, 'id' | 'name'>;
					})[] = [];

					for(let i: number = 0; i < _scheduleAttendanceWithUsers['length']; i++) {
						scheduleAttendanceWithUsers.push({
							id: _scheduleAttendanceWithUsers[i]['id'],
							status: _scheduleAttendanceWithUsers[i]['status'],
							user: {
								id: _scheduleAttendanceWithUsers[i]['userId'],
								name: _scheduleAttendanceWithUsers[i]['name'],
							}
						});
					}

					reply.send(scheduleAttendanceWithUsers);
				});
		});
}