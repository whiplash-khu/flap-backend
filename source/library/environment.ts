import 'dotenv/config';
import { randomBytes } from 'crypto';
import { ENVIRONMENT_VARIABLE_NAMES } from './constant';

process['env']['TS_NODE_FILES'] = 'true';

for(let i: number = 0; i < ENVIRONMENT_VARIABLE_NAMES['length']; i++) {
	if(typeof process['env'][ENVIRONMENT_VARIABLE_NAMES[i]] !== 'string') {
		throw new Error(ENVIRONMENT_VARIABLE_NAMES[i] + ' must be configured');
	}
}

process['env']['PORT'] ||= '80';
process['env']['TZ'] = 'UTC';
process['env']['JSON_WEB_TOKEN_SECRET'] = randomBytes(64).toString('hex');