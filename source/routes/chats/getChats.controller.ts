import { kysely } from '@library/database';
import { Chat, ChatUser, Database, Pagenation } from '@library/type';
import { FastifyRequest, FastifyReply } from 'fastify';
import { ExpressionBuilder, ExpressionWrapper, SelectQueryBuilder } from 'kysely';

export default function (request: FastifyRequest<{
	Querystring: Pagenation & {
		userIds?: ChatUser['userId'][];
	};
}>, reply: FastifyReply): Promise<void> {
	return kysely.selectFrom('chat')
		.select(['chat.id', 'chat.name'])
		.innerJoin('chat_user', 'chat.id', 'chat_user.chat_id')
		.where('chat_user.user_id', '=', request['userId'])
		.$if(Array.isArray(request['query']['userIds']), function (queryBuilder: SelectQueryBuilder<Database, "chat", Pick<Chat, 'id' | 'name'>>): SelectQueryBuilder<Database, "chat", Pick<Chat, 'id' | 'name'>> {
			return queryBuilder.where('chat.id', 'in', kysely.selectFrom('chat_user')
				.select('chat_id')
				.groupBy('chat_id')
				.having(kysely.fn.countAll(), '=', (request['query']['userIds'] as ChatUser['userId'][])['length'])
				.having(kysely.fn.count(function (expressionBuilder: ExpressionBuilder<Database, 'chat_user'>): ExpressionWrapper<Database, "chat_user", number | null> {
					return expressionBuilder.case()
						.when('user_id', 'in', request['query']['userIds'] as ChatUser['userId'][])
						.then(1)
						.end();
				}), '=', 2));
		})
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