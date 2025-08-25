import { Schedule } from '@library/type';
import S, { JSONSchema } from 'fluent-json-schema';
import commonSchema from './common';
import groupSchema from './group';

export default {
	id: commonSchema['id'],
	groupId: groupSchema['id'],
	name: S.string()
		.minLength(1)
		.maxLength(16),
	startAt: commonSchema['datetime'],
	endAt: commonSchema['datetime'],
	address: S.string()
		.minLength(10)
		.maxLength(64),
	place: S.string()
		.minLength(1)
		.maxLength(32),
	description: S.string()
		.maxLength(128)
} satisfies Record<keyof Omit<Schedule, 'createdAt' | 'deletedAt'>, JSONSchema>;