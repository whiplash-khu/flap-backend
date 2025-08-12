import { Verification } from '@library/type';
import { JSONSchema } from 'fluent-json-schema';
import commonSchema from './common';

export default {
	email: commonSchema['email'],
	token: commonSchema['token']
} satisfies Record<keyof Omit<Verification, 'createdAt'>, JSONSchema>;