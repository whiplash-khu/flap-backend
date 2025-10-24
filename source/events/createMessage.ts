import { EventTypes } from '@library/constant';
import { kysely } from '@library/database';
import { ChatMessage, ChatUser, Database, UserWebSocket } from '@library/type';
import { PolicyViolation, sockets, WebSocketEvent } from '@library/websocket';
import chatMessageSchema from '@schemas/chatMessage';
import S from 'fluent-json-schema';
import { Transaction } from 'kysely';

export default new WebSocketEvent(function (socket: UserWebSocket, data: Pick<ChatMessage, 'chatId' | 'content'>): Promise<void> {
	return kysely.transaction()
		.setAccessMode('read write')
		.setIsolationLevel('serializable')
		.execute(function (transaction: Transaction<Database>): Promise<void> {
			let userIds: number[] = [];

			return transaction.selectFrom('chat')
				.where('id', '=', data['chatId'])
				.executeTakeFirst()
				.then(function (chat?: {}): Promise<Pick<ChatUser, 'userId'>[]> {
					if(chat === undefined) {
						throw new PolicyViolation('Message["data"]["chatId"] must be valid');
					}

					return transaction.selectFrom('chat_user')
						.select('user_id as userId')
						.where('chat_id', '=', data['chatId'])
						.execute();
				})
				.then(function (chatUsers: Pick<ChatUser, 'userId'>[]): Promise<Pick<ChatMessage, 'id'>> {
					let hasUser: boolean = false;

					for(let i: number = 0; i < chatUsers['length']; i++) {
						if(!hasUser) {
							hasUser = chatUsers[i]['userId'] === socket['userId'];
						}

						userIds.push(chatUsers[i]['userId']);
					}

					if(!hasUser) {
						throw new PolicyViolation('User must be in chat');
					}

					return transaction.insertInto('chat_message')
						.values({
							chat_id: data['chatId'],
							user_id: socket['userId'],
							content: data['content']
						})
						.returning('id')
						.executeTakeFirstOrThrow();
				})
				.then(function (chatMessage: Pick<ChatMessage, 'id'>): void {
					sockets.send(userIds, {
						type: EventTypes['CREATE_MESSAGE'],
						data: {
							id: chatMessage['id'],
							chatId: data['chatId'],
							userId: socket['userId'],
							content: data['content']
						}
					});
				});
		});
}, S.object()
	.prop('chatId', chatMessageSchema['chatId'].required())
	.prop('content', chatMessageSchema['content'].required()))