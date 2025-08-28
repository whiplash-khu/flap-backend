import { ScheduleAttendanceStatus } from '@library/constant';
import { kysely } from '@library/database';
import { BadRequest, NotFound, Unauthorized } from '@library/httpError';
import { getTimestamp } from '@library/time';
import { Database, Form, Group, GroupUser, ScheduleAttendance, User } from '@library/type';
import { FastifyReply, FastifyRequest } from 'fastify';
import { DeleteResult, ExpressionBuilder, InsertResult, JoinBuilder, Nullable, SelectQueryBuilder, sql, Transaction } from 'kysely';

export default function (request: FastifyRequest<{
	Params: Pick<GroupUser, 'groupId'>;
	Body: Pick<GroupUser, 'userId'>;
}>, reply: FastifyReply): Promise<void> {
	return kysely.transaction()
		.setAccessMode('read write')
		.setIsolationLevel('serializable')
		.execute(function (transaction: Transaction<Database>): Promise<void> {
			return transaction.selectFrom('group')
				.select('group.user_id as userId')
				.leftJoin('form', function (joinBuilder: JoinBuilder<Database, 'group' | 'form'>): typeof joinBuilder {
					return joinBuilder.onRef('group.id', '=', 'form.group_id')
						.on('form.user_id', '=', request['body']['userId']);
				})
				.select('form.user_id as __userId')
				.leftJoin('user', function (joinBuilder: JoinBuilder<Database, 'group' | 'form' | 'user'>): typeof joinBuilder {
					return joinBuilder.onRef('form.user_id', '=', 'user.id')
						.on('user.deleted_at', 'is', null);
				})
				// check first
				.select('user.id as _userId')
				.where('group.id', '=', request['params']['groupId'])
				.where('group.deleted_at', 'is', null)
				.executeTakeFirst()
				.then(function (groupWithUser?: Pick<Group, 'userId'> & Nullable<{
					__userId: Form['userId'];
					_userId: User['id'];
				}>): Promise<(DeleteResult | InsertResult)[]> {
					if(groupWithUser === undefined) {
						throw new NotFound('Params["groupId"] must be valid');
					}

					if(groupWithUser['userId'] !== request['userId']) {
						throw new Unauthorized('User msut be group owner');
					}

					if(groupWithUser['_userId'] === null) {
						throw new BadRequest('Body["userId"] must be valid');
					}

					if(groupWithUser['__userId'] === null) {
						throw new BadRequest('Body["userId"] must create form first');
					}

					return Promise.all([
						transaction.deleteFrom('form')
							.where('group_id', '=', request['params']['groupId'])
							.where('user_id', '=', request['body']['userId'])
							.executeTakeFirstOrThrow(),
						transaction.insertInto('group_user')
							.values({
								group_id: request['params']['groupId'],
								user_id: request['body']['userId']
							})
							.executeTakeFirstOrThrow(),
						transaction.insertInto('schedule_attendance')
							.columns([
								'schedule_id',
								'user_id',
								'status'
							])
							.expression(function (expressionBuilder: ExpressionBuilder<Database, 'schedule_attendance'>): SelectQueryBuilder<Database, 'schedule', Omit<ScheduleAttendance, 'id'>>  {
								return expressionBuilder.selectFrom('schedule')
									.select([
										'id as scheduleId',
										sql.lit(request['body']['userId']).as('userId'),
										sql.lit(ScheduleAttendanceStatus['ABSENT']).as('status')
									])
									.where('group_id', '=', request['params']['groupId'])
									.where('deleted_at', 'is', null)
									.where('start_at', '>', getTimestamp());
							})
							.executeTakeFirstOrThrow()
					]);
				})
				.then(function (): void {
					reply.status(204)
						.send();
				});
		});
}