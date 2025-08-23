import { Form } from '@library/type';
import { JSONSchema} from 'fluent-json-schema';
import userSchema from './user';
import commonSchema from './common';
import groupSchema from './group';

export default {
  id: commonSchema['id'],
  groupId: groupSchema['id'],
  userId: userSchema['id'],
} satisfies Record<keyof Omit<Form, 'createdAt'>, JSONSchema>;