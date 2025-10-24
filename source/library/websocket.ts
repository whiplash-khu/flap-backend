import Ajv, { ValidateFunction } from 'ajv';
import uri from 'fast-uri';
import type { JSONSchema } from 'fluent-json-schema';
import type { NotificationTable, UserWebSocket, WebSocketEventHandler } from './type';
import { EventTypes, WebSocketCloseCodes } from './constant';
import { kysely } from './database';
import { Insertable } from 'kysely';

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
		const send: typeof WebSocket['prototype']['send'] = WebSocket['prototype'].send.bind(value);

		Object.assign(value, {
			send: function (message: {
				type: EventTypes
			} & Record<string, unknown> | string, shouldInsert: boolean = true): void {
				const content: string = shouldInsert ? JSON.stringify(message) : message as string;

				send(content);

				if(shouldInsert) {
					kysely.insertInto('notification')
						.values({
							user_id: key,
							content: content
						})
						.executeTakeFirstOrThrow()
						.catch(function (error: unknown): void {
							sockets.delete(key, error);
						});
				}
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
			socket.close(WebSocketCloseCodes['INTERNAL_ERROR'], error['message']);

			return true;
		}

		socket.close(WebSocketCloseCodes['INTERNAL_ERROR'], String(error));
		
		return true;
	}

	public send(keys: number[] | {
		userId: number;
	}[], message: {
		type: EventTypes
	} & Record<string, unknown>): void {
		const isNested: boolean = typeof keys[0] !== 'number';
		const notificationInserts: Insertable<NotificationTable>[] = [];
		const content: string = JSON.stringify(message);
		
		for(let i: number = 0; i < keys['length']; i++) {
			const socket: UserWebSocket | undefined = super.get(isNested ? (keys[i] as {
				userId: number;
			})['userId'] : keys[i] as number);

			if(socket === undefined) {
				continue;
			}

			switch(message['type']) {
				case EventTypes['CREATE_FEE']: {
					if(socket['setting']['isFeeEnabled']) {
						break;
					}

					continue;
				}
				case EventTypes['CREATE_SCHEDULE']: {
					if(socket['setting']['isScheduleEnabled']) {
						break;
					}

					continue;
				}
				case EventTypes['CREATE_POST']: {
					if(socket['setting']['isPostEnabled']) {
						break;
					}

					continue;
				}
				case EventTypes['CREATE_NOTICE']: {
					if(socket['setting']['isGroupNoticeEnabled']) {
						break;
					}

					continue;
				}
			}

			notificationInserts.push({
				user_id: socket['userId'],
				content: content
			})

			socket.send(content, false);
		}

		kysely.insertInto('notification')
			.values(notificationInserts)
			.executeTakeFirstOrThrow()
			.catch()
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