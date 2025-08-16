import { kysely } from '@library/database';
import { Chat, Database, Pagenation } from '@library/type';
import { FastifyRequest, FastifyReply } from 'fastify';
import { SelectQueryBuilder } from 'kysely';

export default function (request: FastifyRequest<{
	Querystring: Pagenation;
}>, reply: FastifyReply): Promise<void> {
	return kysely.selectFrom('chat')
		.select(['chat.id', 'chat.name'])
		.innerJoin('chat_user', 'chat.id', 'chat_user.chat_id')
		.where('chat_user.user_id', '=', request['userId'])
		.$if(typeof request['query']['index'] === 'number', function (queryBulder: SelectQueryBuilder<Database, "chat", Pick<Chat, 'id' | 'name'>>): SelectQueryBuilder<Database, "chat", Pick<Chat, 'id' | 'name'>> {
			return queryBulder.where('chat.id', '<', request['query']['index'] as number);
		})
		.limit(request['query']['size'])
		.orderBy('chat.id', 'desc')
		.execute()
		.then(function (chats: Pick<Chat, 'id' | 'name'>[]): void {
			reply.send(chats);
		});
}