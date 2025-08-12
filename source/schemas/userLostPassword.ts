import { UserLostPassword } from '@library/type';
import { JSONSchema } from 'fluent-json-schema';
import commonSchema from './common';
import userSchema from './user';

export default {
	userId: userSchema['email'], // ref
	token: commonSchema['token']
} satisfies Record<keyof Omit<UserLostPassword, 'createdAt'>, JSONSchema>;