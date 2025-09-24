import Ajv, { ValidateFunction } from 'ajv';
import uri from 'fast-uri';
import type { JSONSchema } from 'fluent-json-schema';
import type { UserWebSocket, WebSocketEventHandler } from './type';
import { WebSocketCloseCodes } from './constant';

export class WebSocketEvent<T> {
	public static validator: Ajv = new Ajv({
		coerceTypes: 'array',
		useDefaults: true,
		removeAdditional: true,
		uriResolver: uri
	});
	public validate: ValidateFunction<T>;

	constructor(public handler: WebSocketEventHandler<T>, schema: JSONSchema) {
		this.validate = WebSocketEvent['validator'].compile<T>(schema.valueOf());
	}
}

export class WebSocketManager extends Map<number, UserWebSocket> {
	public set(key: number, value: UserWebSocket): this {
		const send: typeof value.send = value.send.bind(value);

		Object.assign(value, {
			send: function (value: unknown): void {
				send(JSON.stringify(value));
			},
			pongAt: 0,
			authInterval: global.setInterval(function (): void {
				value['authAt'] = 0;

				send('{"type":"AUTH"}');

				global.setTimeout(function (): void {
					if(value['authAt'] === 0) {
						sockets.delete(key, new PolicyViolation('Auth must be done on time'));
					}
				}, 60000 /* Timeout in 1 minute */);
			}, 180000 /* Ping per 3 minutes */)
		});

		return super.set(key, value);
	}

	public delete(key: number, error?: unknown): boolean {
		const socket: UserWebSocket | undefined = super.get(key);

		if(socket === undefined) {
			return false;
		}

		global.clearInterval(socket['authInterval']);

		super.delete(key);

		switch(socket['readyState']) {
			case socket['CLOSED']:
			case socket['CLOSING']: {
				return true;
			}
		}

		if(error === undefined) {
			socket.close(WebSocketCloseCodes['NORMAL_CLOSURE']);

			return true;
		}

		if(error instanceof WebSocketError) {
			socket.close(error['closeCode'], error['message']);

			return true;
		}

		if(error instanceof Error) {
			socket.close(WebSocketCloseCodes['ABNORMAL_CLOSURE'], error['message']);

			return true;
		}

		socket.close(WebSocketCloseCodes['ABNORMAL_CLOSURE'], String(error));
		
		return true;
	}

	public send(keys: number[], message: unknown): void {
		for(let i: number = 0; i < keys['length']; i++) {
			const socket: UserWebSocket | undefined = super.get(keys[i]);

			if(socket === undefined) {
				continue;
			}

			socket.send(message);
		}
	}
}

export const sockets: WebSocketManager = new WebSocketManager();

export const events: Map<string, WebSocketEvent<any>> = new Map<string, WebSocketEvent<any>>();

export class WebSocketError extends Error {
	public closeCode: WebSocketCloseCodes = WebSocketCloseCodes['NO_STATUS_RECEIVED'];
}

export class NormalClosure extends WebSocketError {
	public closeCode: WebSocketCloseCodes = WebSocketCloseCodes['NORMAL_CLOSURE'];
}

export class GoingAway extends WebSocketError {
	public closeCode: WebSocketCloseCodes = WebSocketCloseCodes['GOING_AWAY'];
}

export class ProtocolError extends WebSocketError {
	public closeCode: WebSocketCloseCodes = WebSocketCloseCodes['PROTOCOL_ERROR'];
}

export class UnsupportedData extends WebSocketError {
	public closeCode: WebSocketCloseCodes = WebSocketCloseCodes['UNSUPPORTED_DATA'];
}

export class Reserved extends WebSocketError {
	public closeCode: WebSocketCloseCodes = WebSocketCloseCodes['RESERVED'];
}

export class NoStatusReceived extends WebSocketError {
	public closeCode: WebSocketCloseCodes = WebSocketCloseCodes['NO_STATUS_RECEIVED'];
}

export class AbnormalClosure extends WebSocketError {
	public closeCode: WebSocketCloseCodes = WebSocketCloseCodes['ABNORMAL_CLOSURE'];
}

export class InvalidFramePayloadData extends WebSocketError {
	public closeCode: WebSocketCloseCodes = WebSocketCloseCodes['INVALID_FRAME_PAYLOAD_DATA'];
}

export class PolicyViolation extends WebSocketError {
	public closeCode: WebSocketCloseCodes = WebSocketCloseCodes['POLICY_VIOLATION'];
}

export class MessageTooBig extends WebSocketError {
	public closeCode: WebSocketCloseCodes = WebSocketCloseCodes['MESSAGE_TOO_BIG'];
}

export class MandatoryExtension extends WebSocketError {
	public closeCode: WebSocketCloseCodes = WebSocketCloseCodes['MANDATORY_EXTENSION'];
}

export class InternalError extends WebSocketError {
	public closeCode: WebSocketCloseCodes = WebSocketCloseCodes['INTERNAL_ERROR'];
}

export class ServiceRestart extends WebSocketError {
	public closeCode: WebSocketCloseCodes = WebSocketCloseCodes['SERVICE_RESTART'];
}

export class TryAgainLater extends WebSocketError {
	public closeCode: WebSocketCloseCodes = WebSocketCloseCodes['TRY_AGAIN_LATER'];
}

export class BadGateway extends WebSocketError {
	public closeCode: WebSocketCloseCodes = WebSocketCloseCodes['BAD_GATEWAY'];
}

export class TlsHandshakeFailure extends WebSocketError {
	public closeCode: WebSocketCloseCodes = WebSocketCloseCodes['TLS_HANDSHAKE_FAILURE'];
}