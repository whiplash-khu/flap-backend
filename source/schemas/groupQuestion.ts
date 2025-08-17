import { GroupQuestion } from '@library/type';
import S, { JSONSchema } from 'fluent-json-schema';
import commonSchema from './common';
import groupSchema from './group';

export default {
	id: commonSchema['id'],
	groupId: groupSchema['id'],
	content: S.string()
		.minLength(1)
		.maxLength(64)
} satisfies Record<keyof GroupQuestion, JSONSchema>;