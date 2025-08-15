import { ChatUser } from "@library/type";
import S, { JSONSchema} from 'fluent-json-schema';
import commonSchema from "./common";

export default {
	chatId: commonSchema['id'],
	userId: commonSchema['id'],
} satisfies Record<keyof ChatUser, JSONSchema>;