import { kysely } from '@library/database';
import { Chat, ChatUserTable, Database, User, UserWebSocket } from '@library/type';
import { PolicyViolation, sockets, WebSocketEvent } from '@library/websocket';
import S from 'fluent-json-schema';
import chatUserSchema from '@schemas/chatUser';
import { ExpressionBuilder, ExpressionWrapper, Insertable, InsertResult, Transaction } from 'kysely';

export default new WebSocketEvent(function (socket: UserWebSocket, data: {
	userIds: User['id'][];
}): Promise<void> {
	if(!data['userIds'].includes(socket['userId'])) {
		throw new PolicyViolation('Data["userIds"] must include yourself');
	}

	return kysely.transaction()
		.setAccessMode('read write')
		.setIsolationLevel('serializable')
		.execute(function (transaction: Transaction<Database>): Promise<void> {
			const chat: Omit<Chat, 'createdAt'> = {} as Omit<Chat, 'createdAt'>;

			return transaction.selectFrom('user')
				.select('name')
				.where('id', 'in', data['userIds'])
				.where('deleted_at', 'is', null)
				.execute()
				.then(function (users: Pick<User, 'name'>[]): Promise<{} | undefined> {
					if(users['length'] !== data['userIds']['length']) {
						throw new PolicyViolation('Data["userIds"] must be valid');
					}

					chat['name'] = users[0]['name'];

					for(let i: number = 1; i < users['length']; i++) {
						chat['name'] += ', ' + users[i]['name'];
					}

					return transaction.selectFrom('chat_user')
						.groupBy('chat_id')
						.having(kysely.fn.countAll(), '=', data['userIds']['length'])
						.having(kysely.fn.count(function (expressionBuilder: ExpressionBuilder<Database, 'chat_user'>): ExpressionWrapper<Database, "chat_user", number | null> {
							return expressionBuilder.case()
								.when('user_id', 'in', data['userIds'])
								.then(1)
								.end();
						}), '=', 2)
						.executeTakeFirst();
				})
				.then(function (_chat?: {}): Promise<Pick<Chat, 'id'>> {
					if(_chat !== undefined) {
						throw new PolicyViolation('Data["userIds"] must be unique combination among all chats');
					}

					return transaction.insertInto('chat')
						.values({ 
							name: chat['name']
						})
						.returning('id')
						.executeTakeFirstOrThrow();
				})
				.then(function (_chat: Pick<Chat, 'id'>): Promise<InsertResult> {
					const chatUserInserts: Insertable<ChatUserTable>[] = [];

					chat['id'] = _chat['id'];

					for(let i: number = 0; i < data['userIds']['length']; i++) {
						chatUserInserts.push({
							chat_id: chat['id'],
							user_id: data['userIds'][i]
						});
					}

					return transaction.insertInto('chat_user')
						.values(chatUserInserts)
						.executeTakeFirstOrThrow();
				})
				.then(function (): void {
					sockets.send(data['userIds'], '{"type":"CREATE_CHAT","data":{"id":' + chat['id'] + '}}');
				});
		});
}, S.object()
	.prop('userIds', S.array()
		.items(chatUserSchema['userId'])
		.minItems(2)
		.uniqueItems(true)
		.required()));