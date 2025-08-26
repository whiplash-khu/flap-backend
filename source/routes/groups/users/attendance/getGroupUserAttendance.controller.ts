import { ScheduleAttendanceStatus } from '@library/constant';
import { kysely } from '@library/database';
import { NotFound, Unauthorized } from '@library/httpError';
import { Database, Group, GroupUser, ScheduleAttendance } from '@library/type';
import { FastifyReply, FastifyRequest } from 'fastify';
import { JoinBuilder, Transaction } from 'kysely';

export default function (request: FastifyRequest<{
	Params: Pick<GroupUser, 'groupId' | 'userId'>;
}>, reply: FastifyReply): Promise<void> {
	return kysely.transaction()
		.setAccessMode('read only')
		.setIsolationLevel('serializable')
		.execute(function (transaction: Transaction<Database>): Promise<void> {
			return transaction.selectFrom('group')
				.select('group.user_id as userId')
				.leftJoin('group_user', function (joinBuilder: JoinBuilder<Database, 'group' | 'group_user'>): typeof joinBuilder {
					return joinBuilder.onRef('group.id', '=', 'group_user.group_id')
						.on('group_user.user_id', '=', request['params']['userId']);
				})
				.select('group_user.user_id as _userId')
				.where('group.id', '=', request['params']['groupId'])
				.where('group.deleted_at', 'is', null)
				.executeTakeFirst()
				.then(function (groupWithUser?: Pick<Group, 'userId'> & {
					_userId: GroupUser['userId'] | null;
				}): Promise<{
					status: ScheduleAttendance['status'];
					count: number;
				}[]> {
					if(groupWithUser === undefined) {
						throw new NotFound('Params["groupId"] must be valid');
					}

					if(groupWithUser['_userId'] === null) {
						throw new Unauthorized('User must be in group');
					}

					if(request['userId'] !== groupWithUser['userId'] && request['userId'] !== request['params']['userId']) {
						throw new Unauthorized('User must be group owner or yourself');
					}

					return transaction.selectFrom('schedule_attendance')
						.select([
							'schedule_attendance.status',
							kysely.fn.countAll<number>()
								.as('count')
						])
						.innerJoin('schedule', 'schedule_attendance.schedule_id', 'schedule.id')
						.where('schedule.group_id', '=', request['params']['groupId'])
						.where('schedule_attendance.user_id', '=', request['params']['userId'])
						.groupBy('schedule_attendance.status')
						.execute();
				})
				.then(function (attendances: {
					status: ScheduleAttendance['status'];
					count: number;
				}[]): void {
					const attendance: {
						counts: Record<'absent' | 'late' | 'attend', number>;
					} = {
						counts: {
							absent: 0,
							late: 0,
							attend: 0
						}
					};

					for(let i: number = 0; i < attendances['length']; i++) {
						switch(attendances[i]['status']) {
							case ScheduleAttendanceStatus['ABSENT']: {
								attendance['counts']['absent'] = attendances[i]['count'];

								break;
							}

							case ScheduleAttendanceStatus['LATE']: {
								attendance['counts']['late'] = attendances[i]['count'];

								break;
							}

							case ScheduleAttendanceStatus['ATTEND']: {
								attendance['counts']['attend'] = attendances[i]['count'];

								break;
							}

							default: {
								request['log'].error('ScheduleAttendance["status"] must be one of ' + ScheduleAttendanceStatus['ABSENT'] + ', ' + ScheduleAttendanceStatus['LATE'] + ', ' + ScheduleAttendanceStatus['ATTEND']);
							}
						}
					}

					reply.send(attendance);
				});
		});
}