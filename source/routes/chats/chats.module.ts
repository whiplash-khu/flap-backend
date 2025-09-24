import Module from '@library/module';
import S from 'fluent-json-schema';
import getChatsController from './getChats.controller';
import chatUserSchema from '@schemas/chatUser';
import pagenationSchema from '@schemas/pagenation';
import chatMessagesModule from './messages/chatMessages.module';

export default new Module('chats', [
	{
		method: 'GET',
		url: '',
		handler: getChatsController,
		schema: {
			querystring: S.object()
				.prop('index', pagenationSchema['index'])
				.prop('size', pagenationSchema['size'])
				.prop('userIds', S.array()
					.items(chatUserSchema['userId'])
					.minItems(2)
					.uniqueItems(true))
		}
	}
], [chatMessagesModule]);