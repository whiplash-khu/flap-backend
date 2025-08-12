import S from 'fluent-json-schema';

const commonSchema = {
	id: S.integer()
		.minimum(1)
		.maximum(2147483648),
	email: S.string()
		.format('email'),
	sha512: S.string()
		.pattern(/^[0-9a-f]{128}$/),
	token: S.string()
		.pattern(/^[0-9a-f]{32}$/),
	date: S.string()
		.format('date'),
	datetime: S.string()
		.format('date-time'),
} as const;

export default commonSchema;