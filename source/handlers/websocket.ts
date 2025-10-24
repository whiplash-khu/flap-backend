import type { FastifyRequest } from 'fastify';
import authEvent from '@events/auth';
import { UserSetting, UserWebSocket } from '@library/type';
import { events, PolicyViolation, sockets, WebSocketEvent } from '@library/websocket';
import { FastifySchemaValidationError } from 'fastify/types/schema';
import { kysely } from '@library/database';
import schemaErrorFormatHandler from './schemaErrorFormat';
import { EventTypes, WebSocketCloseCodes } from '@library/constant';

export default function webSocketHandler(socket: UserWebSocket, request: FastifyRequest): void {
	sockets.set(request['userId'], socket);
	
	socket.send({
		type: EventTypes['AUTH']
	});

	global.setTimeout(function (): void {
		if(socket['authAt'] === 0) {
			sockets.delete(socket['userId'], new PolicyViolation('Auth must be done on time'));
		}
	}, 60000);

	socket.once('message', function (buffer: Buffer): void {
		try {
			let message: {
				type: "AUTH";
				data: {
					accessToken: string;
				};
			};

			try {
				message = JSON.parse(buffer.toString('utf-8'));

				if(typeof message !== 'object' || message === null) {
					throw 0;
				}
			} catch {
				throw new PolicyViolation('Message must be json');
			}

			if(message['type'] !== 'AUTH') {
				throw new PolicyViolation('Message["type"] must be AUTH');
			}

			if(!authEvent.validate(message['data'])) {
				throw new PolicyViolation(schemaErrorFormatHandler(authEvent.validate['errors'] as FastifySchemaValidationError[], 'Message["data"]')['message']);
			}

			authEvent.handler(socket, message['data']);
		} catch(error: unknown) {
			sockets.delete(socket['userId'], error);

			return;
		}

		kysely.selectFrom('user_setting')
			.select([
				'user_setting.is_group_notice_enabled as isGroupNoticeEnabled',
				'user_setting.is_post_enabled as isPostEnabled',
				'user_setting.is_schedule_enabled as isScheduleEnabled',
				'user_setting.is_fee_enabled as isFeeEnabled'
			])
			.where('user_id', '=', socket['userId'])
			.executeTakeFirst()
			.then(function (setting?: Omit<UserSetting, 'userId'>): void {
				if(setting === undefined) {
					sockets.delete(socket['userId'], new PolicyViolation('Message["type"] must be valid'));

					return;
				}

				socket['setting'] = setting;

				socket.send({
					type: EventTypes['READY']
				});

				socket.on('close', function (code: number, reason: Buffer): void {
					switch(code) {
						case WebSocketCloseCodes['NORMAL_CLOSURE']:
						case WebSocketCloseCodes['NO_STATUS_RECEIVED']: {
							break;
						}

						default: {
							request['log'].warn('Sockets[' + socket['userId'] + '] closed with ' + code + ' reason ' + reason);
						}
					}

					sockets.delete(socket['userId']);
				});

				socket.on('message', function (buffer: Buffer): void {
					try {
						let message: {
							type: string;
							data: unknown;
						};

						try {
							message = JSON.parse(buffer.toString('utf-8'));

							if(typeof message !== 'object' && message !== null) {
								throw 0;
							}
						} catch {
							throw new PolicyViolation('Message must be json');
						}
		
						const event: WebSocketEvent<unknown> | undefined = events.get(message['type']);
		
						if(event === undefined) {
							throw new PolicyViolation('Message["type"] must be valid');
						}
		
						if(!event.validate(message['data'])) {
							throw new PolicyViolation(schemaErrorFormatHandler(event.validate['errors'] as FastifySchemaValidationError[], 'Message["data"]')['message']);
						}
		
						Promise.resolve(event.handler(socket, message['data']))
							.catch(function (error: unknown): void {
								sockets.delete(socket['userId'], error);
							});
					} catch(error: unknown) {
						sockets.delete(socket['userId'], error);
					}
				});
			})
				.catch(function (error: unknown): void {
					sockets.delete(socket['userId'], error);
				});
			
	});

	socket.addEventListener('error', request['log'].error);
}