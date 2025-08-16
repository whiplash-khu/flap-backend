import { emptySelection } from '@library/constant';
import { kysely } from '@library/database';
import { NotFound } from '@library/httpError';
import { Chat, ChatMessage, Database } from '@library/type';
import { FastifyRequest, FastifyReply } from 'fastify';
import { sql, Transaction } from 'kysely';

export default function (request: FastifyRequest<{
	Params: {
		chatId: Chat['id'];
	};
	Body: Pick<ChatMessage, 'content'>;
}>, reply: FastifyReply): Promise<void> {
	return kysely.transaction()
		.setAccessMode('read write')
		.setIsolationLevel('serializable')
		.execute(function (transaction: Transaction<Database>): Promise<void> {
			return transaction.selectFrom('chat_user')
				.select(emptySelection)
				.where('chat_id', '=', request['params']['chatId'])
				.where('user_id', '=', request['userId'])
				.limit(1)
				.executeTakeFirst()
				.then(function (chatUser?: {}): Promise<Pick<Chat, 'id'>> {
					if (chatUser === undefined) {
						throw new NotFound('Params["chatId"] must be valid')
					}

					return transaction.insertInto('chat_message')
						.values({
							chat_id: request['params']['chatId'],
							user_id: request['userId'],
							content: request['body']['content']
						})
						.returning('id')
						.executeTakeFirstOrThrow();
				})
				.then(function (chat: Pick<Chat, 'id'>): void {
					reply.status(201)
						.send(chat);
				});
		});
}