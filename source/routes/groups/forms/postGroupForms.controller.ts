import { kysely } from '@library/database';
import { NotFound, Unauthorized } from '@library/httpError';
import { Database, GroupQuestion, Form, FormAnswerTable, GroupUser, Group } from '@library/type';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Insertable, JoinBuilder, Transaction } from 'kysely';

export default function (request: FastifyRequest<{
	Params: {
		groupId: Form['groupId'];
	};
  Body: {
    content: GroupQuestion['content'][];
  };
}>, reply: FastifyReply): Promise<void> {
	return kysely.transaction()
		.setAccessMode('read write')
		.setIsolationLevel('serializable')
		.execute(function (transaction: Transaction<Database>) {
			return transaction.selectFrom('group')
				.select('group.user_id as _userId')
				.leftJoin('group_user', function (joinBuilder: JoinBuilder<Database, 'group' | 'group_user'>): JoinBuilder<Database, 'group' | 'group_user'> {
					return joinBuilder
						.onRef('group.id', '=', 'group_user.group_id')
						.on('group_user.user_id', '=', request['userId']);
				})
				.select('group_user.user_id as userId')
				.where('group.id', '=', request['params']['groupId'])
				.where('group.deleted_at', 'is', null)
				.executeTakeFirst()
				.then(function (groupWithUser?: {
					_userId: Group['userId']; 
					userId: GroupUser['userId'] | null;
				}) {
					if(groupWithUser === undefined) {
						throw new NotFound('Params["groupId"] must be valid');
					}

					if(groupWithUser['userId'] !== null || groupWithUser['_userId'] === request['userId']) {
						throw new Unauthorized('User must not be in group');
					}
				})
				.then(function () {
					return transaction.insertInto('form')
						.values({
							group_id: request['params']['groupId'],
							user_id: request['userId']
						})
						.returning('id')
						.executeTakeFirstOrThrow();
				})
				.then(function (form: Pick<Form, 'id'>) {
					const groupFormAnswerInserts: Insertable<FormAnswerTable>[] = [];

					for(let i: number = 0; i < request['body']['content'].length; i++) {
						groupFormAnswerInserts.push({
							form_id: form['id'],
							content: request['body']['content'][i]
						})
					}

					return transaction.insertInto('form_answer')
						.values(groupFormAnswerInserts)
						.executeTakeFirstOrThrow()
						.then(() => form);
				})
				.then(function (form: Pick<Form, 'id'>): void {
					reply.status(201)
						.send(form);
				});
		});
}