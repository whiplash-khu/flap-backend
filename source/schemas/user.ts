import { User } from '@library/type';
import S, { JSONSchema } from 'fluent-json-schema';
import commonSchema from './common';
import mediaSchema from './media';

export default {
	id: commonSchema['id'],
	email: commonSchema['email'],
	password: S.string()
		.minLength(3),
	mediaId: mediaSchema['id'],
	name: S.string()
		.minLength(2)
		.maxLength(32),
	birthdate: commonSchema['date'],
	isMale: S.boolean(),
	school: S.string()
		.minLength(4)
		.maxLength(24),
	admissionYear: S.integer()
		.minimum(1900)
} satisfies Record<keyof Omit<User, 'createdAt' | 'deletedAt'>, JSONSchema>;