import { kysely } from "@library/database";
import { NotFound, Unauthorized } from "@library/httpError";
import { FastifyRequest, FastifyReply } from "fastify";

export default function (request: FastifyRequest<{
}>, reply: FastifyReply): Promise<void> {
	const userId = request['userId'];

	return kysely.selectFrom('chat')
		.innerJoin('chat_user', 'chat_user.chat_id', 'chat.id')
			.select(['chat.id', 'chat.name'])
			.where('chat_user.user_id', '=', userId)
			.orderBy('chat.created_at', 'desc')
			.execute()
			.then(function (userWithChat?: Array<{ id: number, name: string }>): void {
				reply.send(userWithChat)
			});
}