import { kysely } from '@library/database';
import { BadRequest, NotFound, Unauthorized } from '@library/httpError';
import { Database, Form, FormAnswerTable, GroupUser, FormAnswer } from '@library/type';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Insertable, InsertResult, JoinBuilder, Nullable, Transaction } from 'kysely';

export default function (request: FastifyRequest<{
	Params: {
		groupId: Form['groupId'];
	};
  Body: {
    answers: FormAnswer['content'][];
  };
}>, reply: FastifyReply): Promise<void> {
	return kysely.transaction()
		.setAccessMode('read write')
		.setIsolationLevel('serializable')
		.execute(function (transaction: Transaction<Database>): Promise<void> {
			let formId: Form['id'];

			return transaction.selectFrom('group')
				.leftJoin('group_user', function (joinBuilder: JoinBuilder<Database, 'group' | 'group_user'>): typeof joinBuilder {
					return joinBuilder
						.onRef('group.id', '=', 'group_user.group_id')
						.on('group_user.user_id', '=', request['userId']);
				})
				.select('group_user.user_id as userId')
				.where('group.id', '=', request['params']['groupId'])
				.where('group.deleted_at', 'is', null)
				.executeTakeFirst()
				.then(function (groupWithUser?: Nullable<Pick<GroupUser, 'userId'>>): Promise<{
					count: number;
				}> {
					if(groupWithUser === undefined) {
						throw new NotFound('Params["groupId"] must be valid');
					}

					if(groupWithUser['userId'] !== null) {
						throw new Unauthorized('User must not be in group');
					}

					return transaction.selectFrom('group_question')
						.select(kysely.fn.countAll<number>().as('count'))
						.where('group_id', '=', request['params']['groupId'])
						.executeTakeFirstOrThrow();
				})
				.then(function (row: {
					count: number;
				}): Promise<Pick<Form, 'id'>> {
					if(row['count'] !== request['body']['answers']['length']) {
						throw new BadRequest('Body["answers"] must match one-to-one with group questions');
					}

					return transaction.insertInto('form')
						.values({
							group_id: request['params']['groupId'],
							user_id: request['userId']
						})
						.returning('id')
						.executeTakeFirstOrThrow();
				})
				.then(function (form: Pick<Form, 'id'>): Promise<InsertResult> {
					const groupFormAnswerInserts: Insertable<FormAnswerTable>[] = [];

					formId = form['id'];

					for(let i: number = 0; i < request['body']['answers']['length']; i++) {
						groupFormAnswerInserts.push({
							form_id: formId,
							content: request['body']['answers'][i]
						});
					}

					return transaction.insertInto('form_answer')
						.values(groupFormAnswerInserts)
						.executeTakeFirstOrThrow();
				})
				.then(function (): void {
					reply.send({
						id: formId
					});
				});
		});
}