import S from 'fluent-json-schema';

export default {
	id: S.integer()
		.minimum(1)
		.maximum(2147483648),
	email: S.string()
		.format('email'),
	sha512: S.string()
		.pattern(/^[0-9a-f]{128}$/),
	token: S.string()
		.pattern(/^[0-9a-f]{64}$/),
	date: S.string()
		.format('date'),
	datetime: S.string()
		.format('date-time'),
	jsonWebToken: S.string()
		.pattern(/(^[\w-]*\.[\w-]*\.[\w-]*$)/)
} as const;