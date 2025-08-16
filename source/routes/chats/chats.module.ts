import Module from '@library/module';
import S from 'fluent-json-schema';
import postChatsController from './postChats.controller';
import getChatsController from './getChats.controller';
import postChatMessagesController from './postChatMessages.controller';
import getChatMessagesController from './getChatMessages.controller';
import chatSchema from '@schemas/chat';
import chatMessageSchema from '@schemas/chatMessage';
import pagenationSchema from '@schemas/pagenation';
import chatUserSchema from '@schemas/chatUser';

export default new Module('chats', [{
	method: 'POST',
	url: '',
	handler: postChatsController,
	schema: {
		body: S.object()
			.prop('name', chatSchema['name'].required())
			.prop('userIds', S.array()
				.items(chatUserSchema['userId'])
				.minItems(2)
				.uniqueItems(true)
				.required())
	}
}, {
	method: 'GET',
	url: '',
	handler: getChatsController,
}, {
	method: 'POST',
	url: ':chatId/messages',
	handler: postChatMessagesController,
	schema: {
		params: S.object()
			.prop('chatId', chatSchema['id'].required()),
		body: S.object()
			.prop('content', chatMessageSchema['content'].required())
	}
}, {
	method: 'GET',
	url: ':chatId/messages',
	handler: getChatMessagesController,
	schema: {
		params: S.object()
			.prop('chatId', chatSchema['id'].required()),
		querystring: S.object()
			.prop('index', pagenationSchema['index'])
			.prop('size', pagenationSchema['size'])
	}
}]);