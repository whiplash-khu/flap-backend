import { kysely } from "@library/database";
import { NotFound } from "@library/httpError";
import { Chat, Database } from "@library/type";
import { FastifyRequest, FastifyReply } from "fastify";
import { Transaction } from "kysely";

export default function(request: FastifyRequest<{
	Params: {
		chatId: Chat['id']
	}
}>, reply: FastifyReply): Promise<void> {
	const userId = request['userId'];
	const chatId = Number(request['params']['chatId']);

	return kysely.transaction()
			.setAccessMode('read only')
			.setIsolationLevel('repeatable read')
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

						return transaction.selectFrom('chat_message')
							.select(['chat_message.id', 'chat_message.user_id', 'chat_message.content', 'chat_message.created_at'])
							.where('chat_id', '=', chatId)
							.orderBy('chat_message.created_at', 'desc')
							.execute()
					})
					.then(function (chatWithMessage): void {
						reply.send(chatWithMessage);
					});
			});
}