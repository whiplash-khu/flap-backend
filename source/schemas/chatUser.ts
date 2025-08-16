import { ChatUser } from '@library/type';
import { JSONSchema} from 'fluent-json-schema';
import chatSchema from './chat';
import userSchema from './user';

export default {
	chatId: chatSchema['id'],
	userId: userSchema['id'],
} satisfies Record<keyof ChatUser, JSONSchema>;