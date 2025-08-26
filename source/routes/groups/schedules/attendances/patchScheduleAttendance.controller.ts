import { kysely } from '@library/database';
import { NotFound, Unauthorized } from '@library/httpError';
import { Database, Group, Schedule, ScheduleAttendance } from '@library/type';
import { FastifyReply, FastifyRequest } from 'fastify';
import { JoinBuilder, Transaction, UpdateResult } from 'kysely';

export default function (request: FastifyRequest<{
	Params: Pick<Schedule & ScheduleAttendance, 'groupId' | 'scheduleId'> & {
		attendanceId: ScheduleAttendance['id'];
	};
	Body: Pick<ScheduleAttendance, 'status'>;
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
				.leftJoin('schedule_attendance', function (joinBuilder: JoinBuilder<Database, 'group' | 'schedule' | 'schedule_attendance'>): typeof joinBuilder {
					return joinBuilder.onRef('schedule.id', '=', 'schedule_attendance.id');
				})
				.select('schedule_attendance.id as attendanceId')
				.where('group.id', '=', request['params']['groupId'])
				.where('group.deleted_at', 'is', null)
				.executeTakeFirst()
				.then(function (groupWithSchedule?: Pick<Group, 'userId'> & {
					scheduleId: Schedule['id'] | null;
					attendanceId: ScheduleAttendance['id'] | null;
				}): Promise<UpdateResult> {
					if(groupWithSchedule === undefined) {
						throw new NotFound('Params["groupId"] must be valid');
					}

					if(groupWithSchedule['scheduleId'] === null) {
						throw new NotFound('Params["scheduleId"] must be valid');
					}

					if(groupWithSchedule['attendanceId'] === null) {
						throw new NotFound('Params["attendanceId"] must be valid');
					}

					if(groupWithSchedule['userId'] !== request['userId']) {
						throw new Unauthorized('User must be group owner');
					}

					return transaction.updateTable('schedule_attendance')
						.set({
							status: request['body']['status']
						})
						.where('id', '=', request['params']['attendanceId'])
						.executeTakeFirstOrThrow();
				})
				.then(function (): void {
					reply.send({
						status: request['body']['status']
					});
				});
		});
}