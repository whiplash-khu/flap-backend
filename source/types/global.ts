import { ENVIRONMENT_VARIABLE_NAMES } from '@library/constant';

declare global {
	namespace NodeJS {
		interface ProcessEnv extends Record<typeof ENVIRONMENT_VARIABLE_NAMES[number], string> {
			NODE_ENV: 'development' | 'production';
			JSON_WEB_TOKEN_SECRET: string;
			PORT: string;
		}
	}
}