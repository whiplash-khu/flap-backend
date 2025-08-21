import S, { JSONSchema } from 'fluent-json-schema';
import { PostReaction } from '@library/type';
import postSchema from './post';
import userSchema from './user';
import { Emojis } from '@library/constant';

export default {
	postId: postSchema['id'],
	userId: userSchema['id'],
	emoji: S.integer()
		.enum([
			Emojis['HEART'],
			Emojis['THUMBS_UP'],
			Emojis['CHECK'],
			Emojis['SMILE'],
			Emojis['SURPISE'],
			Emojis['CRY']
		])
} satisfies Record<keyof PostReaction, JSONSchema>;