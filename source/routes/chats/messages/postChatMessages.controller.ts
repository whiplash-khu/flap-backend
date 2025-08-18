import { kysely } from '@library/database';
import { NotFound, Unauthorized } from '@library/httpError';
import { Chat, ChatMessage, ChatUser, Database } from '@library/type';
import { FastifyRequest, FastifyReply } from 'fastify';
import { JoinBuilder, Nullable, Transaction } from 'kysely';

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
			return transaction.selectFrom('chat')
				.select('chat.id')
				.leftJoin('chat_user', function (joinBuilder: JoinBuilder<Database, 'chat' | 'chat_user'>): JoinBuilder<Database, 'chat' | 'chat_user'> {
					return joinBuilder.onRef('chat.id', '=', 'chat_user.chat_id')
						.on('chat_user.user_id', '=', request['userId']);
				})
				.select('chat_user.user_id as userId')
				.where('chat.id', '=', request['params']['chatId'])
				.executeTakeFirst()
				.then(function (chatWithUser?: Nullable<Pick<ChatUser, 'userId'>>): Promise<Pick<ChatMessage, 'id'>> {
					if(chatWithUser === undefined) {
						throw new NotFound('Params["chatId"] must be valid');
					}

					if(typeof chatWithUser['userId'] !== 'number') {
						throw new Unauthorized('Params["userId"] must in chat');
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
				.then(function (chatMessage: Pick<ChatMessage, 'id'>): void {
					reply.status(201)
						.send(chatMessage);
				});
		});
}