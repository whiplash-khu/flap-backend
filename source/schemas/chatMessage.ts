import { ChatMessage } from '@library/type';
import S, { JSONSchema} from 'fluent-json-schema';
import commonSchema from './common';
import chatSchema from './chat';
import userSchema from './user';

export default {
	id: commonSchema['id'],
	chatId: chatSchema['id'],
	userId: userSchema['id'],
	content: S.string()
		.minLength(1)
		.maxLength(320)
} satisfies Record<keyof Omit<ChatMessage, 'createdAt'>, JSONSchema>;