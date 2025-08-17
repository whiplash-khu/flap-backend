import { Media } from '@library/type';
import S, { JSONSchema } from 'fluent-json-schema';
import commonSchema from './common';

export default {
	id: commonSchema['id'],
	hash: commonSchema['sha512'],
	type: S.string()
		.maxLength(32)
} satisfies Record<keyof Omit<Media, 'createdAt'>, JSONSchema>;