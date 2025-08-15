import Module from '@library/module';import S from "fluent-json-schema";
import postChatController from "./postChat.controller";
import getChatController from "./getChat.controller";
import postChatMessageController from "./postChatMessage.controller";
import getChatMessageController from "./getChatMessage.controller";
import chat from "@schemas/chat";
import chatMessage from '@schemas/chatMessage';

export default new Module('chats', [{
	method: 'POST',
	url: '',
	handler: postChatController,
	schema: {
		body: S.object()
			.prop('name', chat['name'].required())
	}
}, {
	method: 'GET',
	url: '',
	handler: getChatController,
}, {
	method: 'POST',
	url: ':chatId/messages',
	handler: postChatMessageController,
	schema: {
		params: S.object()
			.prop('chatId', chat['id'].required()),
		body: S.object()
			.prop('content', chatMessage['content'].required())
	}
}, {
	method: 'GET',
	url: ':chatId/messages',
	handler: getChatMessageController,
	schema: {
		params: S.object()
			.prop('chatId', chat['id'].required())
	}
}])