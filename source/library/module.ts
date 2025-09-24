import { FastifyInstance } from 'fastify';
import { join } from 'path/posix';
import schemaErrorFormatHandler from 'source/handlers/schemaErrorFormat';
import { RouteOptions } from './type';
import authHandler from '@handlers/auth';

export default class Module {
	constructor(public prefix: string, public routers: RouteOptions[], public modules: Module[] = []) {}

	public appendPrefix(prefix: string): void {
		this['prefix'] = join(prefix, this['prefix']);

		return;
	}

	public register(fastify: FastifyInstance): void {
		for(let i: number = 0; i < this['routers']['length']; i++) {
			fastify.route(Object.assign(this['routers'][i], {
				url: join(fastify['prefix'], this['prefix'], this['routers'][i]['url']),
				schemaErrorFormatter: schemaErrorFormatHandler
			}, this['routers'][i]['excludePreHandler'] === true ? undefined : {
				preHandler: authHandler
			}));
		}

		for(let i: number = 0; i < this['modules']['length']; i++) {
			this['modules'][i].appendPrefix(this['prefix']);
			this['modules'][i].register(fastify);
		}

		return;
	}
}