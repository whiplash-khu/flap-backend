import { ChatMessage } from "@library/type";
import S, { JSONSchema} from 'fluent-json-schema';
import commonSchema from "./common";

export default {
	id: commonSchema['id'],
	chatId: commonSchema['id'],
	userId: commonSchema['id'],
	content: S.string()
		.minLength(1)
		.maxLength(320)
} satisfies Record<keyof Omit<ChatMessage, 'createdAt'>, JSONSchema>;