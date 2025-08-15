import { User } from '@library/type';
import S, { JSONSchema } from 'fluent-json-schema';
import commonSchema from './common';
import mediaSchema from './media';

export default {
	id: commonSchema['id'],
	email: commonSchema['email'],
	password: S.string()
		.minLength(3),
	name: S.string()
		.minLength(2)
		.maxLength(37),
	school: S.string()
		.minLength(10)
		.maxLength(24),
	birthAt: commonSchema['date'],
	mediaId: mediaSchema['id']
} satisfies Record<keyof Omit<User, 'salt' | 'createdAt' | 'deletedAt'>, JSONSchema>;