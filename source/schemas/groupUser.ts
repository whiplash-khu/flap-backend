import { GroupUser } from '@library/type';
import { JSONSchema } from 'fluent-json-schema';
import groupSchema from './group';
import userSchema from './user';

export default {
	groupId: groupSchema['id'],
	userId: userSchema['id'],
} satisfies Record<keyof Omit<GroupUser, 'id'>, JSONSchema>;