import { Chat } from "@library/type";
import S, { JSONSchema} from 'fluent-json-schema';
import commonSchema from "./common";

export default {
    id: commonSchema['id'],
    name: S.string()
        .minLength(1)
        .maxLength(16)
} satisfies Record<keyof Omit<Chat, 'createdAt'>, JSONSchema>;