import S, { JSONSchema } from 'fluent-json-schema';
import { PostReaction } from '@library/type';
import postSchema from './post';
import userSchema from './user';

export default {
	postId: postSchema['id'],
	userId: userSchema['id'],
	emoji: S.string()
		.maxLength(8)
} satisfies Record<keyof PostReaction, JSONSchema>;