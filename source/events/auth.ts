import { PolicyViolation, WebSocketEvent } from '@library/websocket';
import commonSchema from '@schemas/common';
import S from 'fluent-json-schema';
import JsonWebToken from '@library/jsonWebToken';
import type { UserWebSocket } from '@library/type';
import { getEpoch } from '@library/time';

export default new WebSocketEvent(function (socket: UserWebSocket, data: {
	accessToken: string;
}): void {
	const jsonWebToken: JsonWebToken<{
		uid: number;
	}> = new JsonWebToken<{
		uid: number;
	}>(data['accessToken'], process['env']['JSON_WEB_TOKEN_SECRET']);

	if(!jsonWebToken.isValid()) {
		throw new PolicyViolation('Message["data"]["accessToken"] must be valid');
	}

	socket['authAt'] = getEpoch();
}, S.object()
	.prop('accessToken', commonSchema['jsonWebToken'].required()));