import { EMPTY_SELECTION } from '@library/constant';
import { kysely } from '@library/database';
import { BadRequest } from '@library/httpError';
import { Chat, ChatUserTable, Database, User } from '@library/type';
import { FastifyRequest, FastifyReply } from 'fastify';
import { ExpressionBuilder, ExpressionWrapper, Insertable, InsertResult, Transaction } from 'kysely';

export default function (request: FastifyRequest<{
	Body: {
		userIds: User['id'][];
	};
}>, reply: FastifyReply): Promise<void> {
	if(!request['body']['userIds'].includes(request['userId'])) {
		throw new BadRequest('Body["userIds"] must include yourself');
	}

	return kysely.transaction()
		.setAccessMode('read write')
		.setIsolationLevel('serializable')
		.execute(function (transaction: Transaction<Database>): Promise<void> {
			const chat: Omit<Chat, 'createdAt'> = {} as Omit<Chat, 'createdAt'>;

			return transaction.selectFrom('user')
				.select('name')
				.where('id', 'in', request['body']['userIds'])
				.where('deleted_at', 'is', null)
				.execute()
				.then(function (users: Pick<User, 'name'>[]): Promise<{} | undefined> {
					if(users['length'] !== request['body']['userIds']['length']) {
						throw new BadRequest('Body["userIds"] must be valid');
					}

					chat['name'] = users[0]['name'];

					for(let i: number = 1; i < users['length']; i++) {
						chat['name'] += ', ' + users[i]['name'];
					}

					return transaction.selectFrom('chat_user')
						.select(EMPTY_SELECTION)
						.groupBy('chat_id')
						.having(kysely.fn.countAll(), '=', request['body']['userIds']['length'])
						.having(kysely.fn.count(function (expressionBuilder: ExpressionBuilder<Database, 'chat_user'>): ExpressionWrapper<Database, "chat_user", number | null> {
							return expressionBuilder.case()
								.when('user_id', 'in', request['body']['userIds'])
								.then(1)
								.end();
						}), '=', 2)
						.executeTakeFirst();
				})
				.then(function (_chat?: {}): Promise<Pick<Chat, 'id'>> {
					if(_chat !== undefined) {
						throw new BadRequest('Body["userIds"] must be unique combination among all chats');
					}

					return transaction.insertInto('chat')
						.values({ 
							name: chat['name']
						})
						.returning('id')
						.executeTakeFirstOrThrow();
				})
				.then(function (_chat: Pick<Chat, 'id'>): Promise<InsertResult> {
					const chatUserInserts: Insertable<ChatUserTable>[] = [];

					chat['id'] = _chat['id'];

					for(let i: number = 0; i < request['body']['userIds']['length']; i++) {
						chatUserInserts.push({
							chat_id: chat['id'],
							user_id: request['body']['userIds'][i]
						});
					}

					return transaction.insertInto('chat_user')
						.values(chatUserInserts)
						.executeTakeFirstOrThrow();
				})
				.then(function (): void {
					reply.status(201)
						.header('location', '/chats/' + chat['id'])
						.send({ 
							id: chat['id']
						});
				});
		});
}
