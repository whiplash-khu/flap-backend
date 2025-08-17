import Module from '@library/module';
import S from 'fluent-json-schema';
import postChatMessagesController from './postChatMessages.controller';
import getChatMessagesController from './getChatMessages.controller';
import chatMessageSchema from '@schemas/chatMessage';
import pagenationSchema from '@schemas/pagenation';

export default new Module('messages', [
	{
		method: 'POST',
		url: ':chatId/messages',
		handler: postChatMessagesController,
		schema: {
			params: S.object()
				.prop('chatId', chatMessageSchema['chatId'].required()),
			body: S.object()
				.prop('content', chatMessageSchema['content'].required())
		}
	}, {
		method: 'GET',
		url: ':chatId/messages',
		handler: getChatMessagesController,
		schema: {
			params: S.object()
				.prop('chatId', chatMessageSchema['chatId'].required()),
			querystring: S.object()
				.prop('index', pagenationSchema['index'])
				.prop('size', pagenationSchema['size'])
		}
	}
]);