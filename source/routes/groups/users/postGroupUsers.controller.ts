import { kysely } from '@library/database';
import { BadRequest, NotFound, Unauthorized } from '@library/httpError';
import { Database, Form, Group, GroupUser } from '@library/type';
import { FastifyReply, FastifyRequest } from 'fastify';
import { DeleteResult, InsertResult, JoinBuilder, Nullable, Transaction } from 'kysely';

export default function (request: FastifyRequest<{
	Params: Pick<GroupUser, 'groupId'>;
	Body: Pick<GroupUser, 'userId'>;
}>, reply: FastifyReply): Promise<void> {
	return kysely.transaction()
		.setAccessMode('read write')
		.setIsolationLevel('serializable')
		.execute(function (transaction: Transaction<Database>): Promise<void> {
			return transaction.selectFrom('group')
				.select('user_id as userId')
				.where('id', '=', request['params']['groupId'])
				.where('deleted_at', 'is', null)
				.executeTakeFirst()
				.then(function (group?: Pick<Group, 'userId'>): Promise<Nullable<Pick<Form, 'userId'>> | undefined> {
					if(group === undefined) {
						throw new NotFound('Params["groupId"] must be valid');
					}

					if(group['userId'] !== request['userId']) {
						throw new Unauthorized('Group["userId"] must be yourself');
					}

					return transaction.selectFrom('user')
						.leftJoin('form', function (joinBuilder: JoinBuilder<Database, 'user' | 'form'>): JoinBuilder<Database, 'user' | 'form'> {
							return joinBuilder.onRef('user.id', '=', 'form.user_id')
								.on('form.user_id', '=', request['body']['userId']);
						})
						.select('form.user_id as userId')
						.where('user.id', '=', request['body']['userId'])
						.where('user.deleted_at', 'is', null)
						.executeTakeFirst();
				})
				.then(function (userWithForm?: Nullable<Pick<Form, 'userId'>>): Promise<(DeleteResult | InsertResult)[]> {
					if(userWithForm === undefined) {
						throw new BadRequest('Body["userId"] must be valid');
					}

					if(userWithForm['userId'] === null) {
						throw new BadRequest('User with body["userId"] must create form first');
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
							.executeTakeFirstOrThrow()
					]);
				})
				.then(function (): void {
					reply.status(204)
						.send();
				});
		});
}