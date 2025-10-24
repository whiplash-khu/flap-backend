import { kysely } from '@library/database';
import { BadRequest, NotFound, Unauthorized } from '@library/httpError';
import { getTimestamp, parseTime } from '@library/time';
import { Database, Group, Schedule, ScheduleTable } from '@library/type';
import { FastifyReply, FastifyRequest } from 'fastify';
import { JoinBuilder, Nullable, SelectQueryBuilder, sql, Transaction, UpdateQueryBuilder, UpdateResult } from 'kysely';

export default function (request: FastifyRequest<{
	Params: {
		groupId: Schedule['groupId'];
		scheduleId: Schedule['id'];
	};
	Body: Partial<Pick<Schedule, 'name' | 'address' | 'description'> & Record<'startAt' | 'endAt', string>>;
}>, reply: FastifyReply): Promise<void> {
	return kysely.transaction()
		.setAccessMode('read write')
		.setIsolationLevel('serializable')
		.execute(function (transaction: Transaction<Database>): Promise<void> {
			const shouldUpdateStartAt: boolean = typeof request['body']['startAt'] === 'string';
			const shouldUpdateEndAt: boolean = typeof request['body']['endAt'] === 'string';
			let startAt: number;
			let endAt: number;
			let startAtObject: string;
			let endAtObject: string;

			if(shouldUpdateStartAt) {
				startAt = parseTime(request['body']['startAt'] as string);
			}

			if(shouldUpdateEndAt) {
				endAt = parseTime(request['body']['endAt'] as string);
			}

			return transaction.selectFrom('group')
				.select('group.user_id as userId')
				.leftJoin('schedule', function (joinBuilder: JoinBuilder<Database, 'group' | 'schedule'>): typeof joinBuilder {
					return joinBuilder.onRef('group.id', '=', 'schedule.group_id')
						.on('schedule.deleted_at', 'is', null);
				})
				.select('schedule.id as scheduleId')
				.$if(shouldUpdateStartAt && !shouldUpdateEndAt, function (queryBuilder: SelectQueryBuilder<Omit<Database, 'schedule'> & {
					schedule: Nullable<ScheduleTable>;
				}, 'group' | 'schedule', Pick<Group, 'userId'> & {
					scheduleId: Schedule['id'] | null;
				}>): typeof queryBuilder {
					return queryBuilder.select(sql<number>`extract(epoch from schedule.end_at)`.as('endAt'));
				})
				.$if(shouldUpdateEndAt && !shouldUpdateStartAt, function (queryBuilder: SelectQueryBuilder<Omit<Database, 'schedule'> & {
					schedule: Nullable<ScheduleTable>;
				}, 'group' | 'schedule', Pick<Group, 'userId'> & {
					scheduleId: Schedule['id'] | null;
				}>): typeof queryBuilder {
					return queryBuilder.select(sql<number>`extract(epoch from schedule.start_at)`.as('startAt'));
				})
				.where('group.id', '=', request['params']['groupId'])
				.where('group.deleted_at', 'is', null)
				.executeTakeFirst()
				.then(function (groupWithSchedule?: Pick<Group, 'userId'> & {
					scheduleId: Schedule['id'] | null;
				} & Partial<Record<'startAt' | 'endAt', number>>): Promise<{} | undefined> | undefined {
					if(groupWithSchedule === undefined) {
						throw new NotFound('Params["groupId"] must be valid');
					}

					if(groupWithSchedule['scheduleId'] === null) {
						throw new NotFound('Params["scheduleId"] must be valid');
					}

					if(groupWithSchedule['userId'] !== request['userId']) {
						throw new Unauthorized('User must be group owner');
					}

					if(shouldUpdateStartAt || shouldUpdateEndAt) {
						if(shouldUpdateStartAt) {
							startAtObject = 'Body';
						} else {
							startAt = groupWithSchedule['startAt'] as number;
							startAtObject = 'Schedule';
						}

						if(shouldUpdateEndAt) {
							endAtObject = 'body';
						} else {
							endAt = groupWithSchedule['endAt'] as number;
							endAtObject = 'schedule';
						}

						if(startAt >= endAt) {
							throw new BadRequest(startAtObject + '["startAt"] must be earlier than ' + endAtObject + '["endAt"]');
						}

						return transaction.selectFrom('schedule')
							.where('start_at', '<', getTimestamp(startAt))
							.where('end_at', '>', getTimestamp(endAt))
							.where('group_id', '=', request['params']['groupId'])
							.where('deleted_at', 'is', null)
							.limit(1)
							.executeTakeFirst();
					}

					return;
				})
				.then(function (schedule?: {}): Promise<UpdateResult> {
					if(schedule !== undefined) {
						throw new BadRequest(startAtObject + '["startAt"] and ' + endAtObject + '["endAt"] must not overlap other schedule');
					}

					return transaction.updateTable('schedule')
						.set({
							name: request['body']['name'],
							address: request['body']['address'],
							description: request['body']['description']
						})
						.$if(shouldUpdateStartAt, function (queryBuilder: UpdateQueryBuilder<Database, "schedule", "schedule", UpdateResult>): typeof queryBuilder {
							return queryBuilder.set('start_at', getTimestamp(startAt));
						})
						.$if(shouldUpdateEndAt, function (queryBuilder: UpdateQueryBuilder<Database, "schedule", "schedule", UpdateResult>): typeof queryBuilder {
							return queryBuilder.set('end_at', getTimestamp(endAt));
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