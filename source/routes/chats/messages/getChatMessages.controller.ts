import { kysely } from '@library/database';
import { NotFound, Unauthorized } from '@library/httpError';
import { Chat, ChatMessage, ChatUser, Database, Media, Pagenation, User } from '@library/type';
import { FastifyRequest, FastifyReply } from 'fastify';
import { JoinBuilder, Nullable, SelectQueryBuilder, Transaction } from 'kysely';

export default function(request: FastifyRequest<{
	Params: {
		chatId: Chat['id'];
	};
	Querystring: Pagenation;
}>, reply: FastifyReply): Promise<void> {
	return kysely.transaction()
		.setAccessMode('read only')
		.setIsolationLevel('repeatable read')
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
				.then(function (chatWithUser?: Nullable<Pick<ChatUser, 'userId'>>): Promise<Pick<ChatMessage & User & Media, 'id' | 'userId' | 'content' | 'createdAt' | 'name' | 'mediaId' | 'hash' | 'type'>[]> {
					if(chatWithUser === undefined) {
						throw new NotFound('Params["chatId"] must be valid');
					}

					if(typeof chatWithUser['userId'] !== 'number') {
						throw new Unauthorized('Params["userId"] must in chat');
					}

					return transaction.selectFrom('chat_message')
						.select(['chat_message.id', 'chat_message.id as userId', 'chat_message.content', 'chat_message.created_at as createdAt'])
						.innerJoin('user', 'chat_message.user_id', 'user.id')
						.select(['user.name', 'user.media_id as mediaId'])
						.innerJoin('media', 'user.media_id', 'media.id')
						.select(['media.hash', 'media.type'])
						.where('chat_id', '=', request['params']['chatId'])
						.$if(typeof request['query']['index'] === 'number', function (queryBulder: SelectQueryBuilder<Database, "chat_message" | "media" | "user", Pick<ChatMessage & User & Media, 'id' | 'userId' | 'content' | 'createdAt' | 'name' | 'mediaId' | 'hash' | 'type'>>): SelectQueryBuilder<Database, "chat_message" | "media" | "user", Pick<ChatMessage & User & Media, 'id' | 'userId' | 'content' | 'createdAt' | 'name' | 'mediaId' | 'hash' | 'type'>> {
							return queryBulder.where('chat_message.id', '<', request['query']['index'] as number);
						})
						.orderBy('chat_message.id', 'desc')
						.limit(request['query']['size'])
						.execute();
				})
				.then(function (_chatMessages: Pick<ChatMessage & User & Media, 'id' | 'userId' | 'content' | 'createdAt' | 'name' | 'mediaId' | 'hash' | 'type'>[]): void {
					const chatMessages: (Pick<ChatMessage, 'id' | 'content' | 'createdAt'> & {
						user: Pick<User, 'id' | 'name'> & {
							media: Pick<Media, 'id' | 'hash' | 'type'>;
						};
					})[] = [];

					for(let i: number = 0; i < _chatMessages['length']; i++) {
						chatMessages.push({
							id: _chatMessages[i]['id'],
							content: _chatMessages[i]['content'],
							createdAt: _chatMessages[i]['createdAt'],
							user: {
								id: _chatMessages[i]['userId'],
								name: _chatMessages[i]['name'],
								media: {
									id: _chatMessages[i]['mediaId'],
									hash: _chatMessages[i]['hash'],
									type: _chatMessages[i]['type'],
								}
							}
						});
					}

					reply.send(chatMessages);
				});
		});
}