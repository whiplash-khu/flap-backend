import S from 'fluent-json-schema';
import commonSchema from './common';

export default {
	index: commonSchema['id'],
	// lazy
	size: S.integer()
		.minimum(1)
		.maximum(50)
		.default(10),
	include: S.boolean()
		.default(false),
	reverse: S.boolean()
		.default(false)
} as const;