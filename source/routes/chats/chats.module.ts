import Module from '@library/module';
import S from 'fluent-json-schema';
import postChatsController from './postChats.controller';
import getChatsController from './getChats.controller';
import chatSchema from '@schemas/chat';
import chatUserSchema from '@schemas/chatUser';
import chatMessagesModule from './messages/chatMessages.module';

export default new Module('chats', [
	{
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
	}
], [chatMessagesModule]);