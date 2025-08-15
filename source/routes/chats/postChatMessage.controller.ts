import { kysely } from "@library/database";
import { NotFound } from "@library/httpError";
import { Chat, ChatMessage, Database } from "@library/type";
import { FastifyRequest, FastifyReply } from "fastify";
import { Transaction } from 'kysely';

export default function (request: FastifyRequest<{
	Params: {
		chatId: Chat['id']
	};
	Body: {
		content: ChatMessage['content']
	}
}>, reply: FastifyReply): Promise<void> {
	const userId = request['userId'];
	const chatId = Number(request['params']['chatId']);
	
	return kysely.transaction()
		.setAccessMode('read write')
		.setIsolationLevel('serializable')
		.execute(function (transaction: Transaction<Database>): Promise<void> {

			return transaction.selectFrom('chat_user')
				.select('chat_id')
				.where('chat_id', '=', chatId)
				.where('user_id', '=', userId)
				.executeTakeFirst()
				.then(function (userWithChat) {
					if (!userWithChat) {
						throw new NotFound('Params["chatId"] must be valid')
					}

					return transaction.insertInto('chat_message')
						.values({
							chat_id: chatId,
							user_id: userId,
							content: request['body']['content']
						})
						.returning(['id', 'chat_id', 'user_id', 'content', 'created_at'])
						.executeTakeFirstOrThrow();
				})
				.then(function (chatWithMessage): void {
					reply.send({
						id: chatWithMessage['id'],
						chatId: chatWithMessage['chat_id'],
						userId: chatWithMessage['user_id'],
						content: chatWithMessage['content'],
						createdAt: chatWithMessage['created_at']
					})
				});
		});
}