import { JSONSchema } from 'fluent-json-schema';
import commonSchema from './common';
import feeSchema from './fee';
import userSchema from './user';
import { FeeSubmission } from '@library/type';

export default {
	id: commonSchema['id'],
	feeId: feeSchema['id'],
	userId: userSchema['id']
} satisfies Record<keyof Omit<FeeSubmission, 'createdAt'>, JSONSchema>;