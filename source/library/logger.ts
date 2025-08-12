import { FastifyBaseLogger, FastifyReply, FastifyRequest } from 'fastify';
import { Bindings, ChildLoggerOptions, LogLevel } from 'fastify/types/logger';
import { Socket } from 'net';
import { inspect } from 'util';
import { ReplyLog } from './type';

export default class Logger implements FastifyBaseLogger {
	public msgPrefix: string | undefined;
	public level: LogLevel | 'silent' | (string & {}) = 'silent';

	static log(level: LogLevel, _arguments: unknown[]): void {
		let print: Socket['write'];
		let levelColor: number = 32;

		switch(level) {
			case 'error':
			case 'fatal': {
				print = process['stderr'].write.bind(process['stderr']);
				levelColor--;

				break;
			}

			case 'warn': {
				levelColor++;
			}

			default: {
				print = process['stdout'].write.bind(process['stdout']);
			}
		}

		print('\x1b[36m' + (new Date()).toISOString().slice(0, -5).replace('T', ' ') + ' \x1b[' + levelColor + 'm' + level.toUpperCase() + '\x1b[37m' + ' ');
		//print((new Date()).toISOString().slice(0, -5).replace('T', ' ') + ' ' + level.toUpperCase() + ' ');

		switch(typeof _arguments[0]) {
			case 'string': {
				print(_arguments[0]);

				break;
			}

			case 'object': {
				if(_arguments[0] === null) {
					print('null');

					break;
				}

				print(inspect(_arguments[0], false, null));

				break;
			}

			default: {
				print(String(_arguments[0]));
			}
		}

		print('\n');
	}

	public info(..._arguments: unknown[]): void {
		Logger.log('info', _arguments);
	}

	public warn(..._arguments: unknown[]): void {
		Logger.log('warn', _arguments);
	}

	public error(..._arguments: unknown[]): void {
		Logger.log('error', _arguments);
	}

	public fatal(..._arguments: unknown[]): void {
		Logger.log('fatal', _arguments);
	}

	public trace(..._arguments: unknown[]): void {
		Logger.log('trace', _arguments);
	}

	public debug(..._arguments: unknown[]): void {
		Logger.log('debug', _arguments);
	}

	public silent(..._: unknown[]): void {}

	public child(_: Bindings, __?: ChildLoggerOptions | undefined): FastifyBaseLogger {
		return this;
	}
}