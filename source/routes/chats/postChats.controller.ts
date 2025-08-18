import { emptySelection } from '@library/constant';
import { kysely } from '@library/database';
import { BadRequest } from '@library/httpError';
import { Chat, ChatUserTable, Database, User } from '@library/type';
import { FastifyRequest, FastifyReply } from 'fastify';
import { ExpressionBuilder, ExpressionWrapper, Insertable, InsertResult, Transaction } from 'kysely';

export default function (request: FastifyRequest<{
	Body: {
		name: Chat['name'];
		userIds: User['id'][];
	};
}>, reply: FastifyReply): Promise<void> {
	return kysely.transaction()
		.setAccessMode('read write')
		.setIsolationLevel('serializable')
		.execute(function (transaction: Transaction<Database>): Promise<void> {
			let chatId: Chat['id'];

			return transaction.selectFrom('user')
				.select(kysely.fn.countAll<number>().as('count'))
				.where('id', 'in', request['body']['userIds'])
				.where('deleted_at', 'is', null)
				.executeTakeFirstOrThrow()
				.then(function (user: {
					count: number;
				}): Promise<{} | undefined> {
					if(user['count'] !== request['body']['userIds']['length']) {
						throw new BadRequest('Body["userIds"] must be valid');
					}

					return transaction.selectFrom('chat_user')
						.select(emptySelection)
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
				.then(function (chat?: {}): Promise<Pick<Chat, 'id'>> {
					if(chat !== undefined) {
						throw new BadRequest('Body["userIds"] must be unique combination among all chats');
					}

					return transaction.insertInto('chat')
						.values({ 
							name: request['body']['name'] 
						})
						.returning('id')
						.executeTakeFirstOrThrow();
				})
				.then(function (chat: Pick<Chat, 'id'>): Promise<InsertResult> {
					const chatUserInserts: Insertable<ChatUserTable>[] = [];

					chatId = chat['id'];

					for(let i: number = 0; i < request['body']['userIds']['length']; i++) {
						chatUserInserts.push({
							chat_id: chatId,
							user_id: request['body']['userIds'][i]
						});
					}

					return transaction.insertInto('chat_user')
						.values(chatUserInserts)
						.executeTakeFirstOrThrow();
				})
				.then(function (): void {
					reply.status(201)
						.header('location', '/chats/' + chatId)
						.send({ 
							id: chatId
						});
				});
		});
}
