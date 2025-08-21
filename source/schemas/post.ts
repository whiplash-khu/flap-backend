import S, { JSONSchema } from 'fluent-json-schema';
import { Post } from '@library/type';
import commonSchema from './common';
import groupSchema from './group';
import userSchema from './user';

export default {
	id: commonSchema['id'],
	groupId: groupSchema['id'],
	userId: userSchema['id'],
	isNotice: S.boolean(),
	content: S.string()
		.minLength(1)
		.maxLength(160)
		
} satisfies Record<keyof Omit<Post, 'createdAt' | 'deletedAt'>, JSONSchema>;