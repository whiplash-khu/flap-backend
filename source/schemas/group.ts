import { Group } from '@library/type';
import S, { JSONSchema } from 'fluent-json-schema';
import commonSchema from './common';
import mediaSchema from './media';
import userSchema from './user';

export default {
	id: commonSchema['id'],
	mediaId: mediaSchema['id'],
	userId: userSchema['id'],
	name: S.string()
		.minLength(3)
		.maxLength(16),
	introduction: S.string()
		.maxLength(320),
	description: S.string()
		.maxLength(32),
	startAt: commonSchema['date'],
	endAt: commonSchema['date']
} satisfies Record<keyof Omit<Group, 'createdAt' | 'deletedAt'>, JSONSchema>;