import Module from '@library/module';
import S from 'fluent-json-schema';
import getChatMessagesController from './getChatMessages.controller';
import chatMessageSchema from '@schemas/chatMessage';
import pagenationSchema from '@schemas/pagenation';

export default new Module(':chatId/messages', [
	{
		method: 'GET',
		url: '',
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