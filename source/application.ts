import '@library/environment';
import Fastify, { FastifyInstance } from 'fastify';
import Logger from '@library/logger';
import errorHandler from '@handlers/error';
import headerHandler from '@handlers/header';
import notFoundHandler from '@handlers/notFound';
import serializeHandler from '@handlers/serialize';
import responseLogHandler from '@handlers/responseLog';
import multipartFormDataHandler from '@handlers/multipartFormData';
import rootModule from './routes/root.module';
import fastifyWebsocket from '@fastify/websocket';
import { events } from '@library/websocket';
import authEvent from '@events/auth';
import createChatEvent from '@events/createChat';
import createMessageEvent from '@events/createMessage';

const fastify: FastifyInstance = Fastify({
	trustProxy: true,
	exposeHeadRoutes: false,
	disableRequestLogging: true,
	loggerInstance: Logger['instance']
});

fastify.setNotFoundHandler(notFoundHandler);
fastify.setErrorHandler(errorHandler);
fastify.setReplySerializer(serializeHandler);
fastify.addHook('preHandler', headerHandler);
fastify.addHook('onResponse', responseLogHandler);
fastify.addContentTypeParser('multipart/form-data', multipartFormDataHandler);

fastify.register(fastifyWebsocket)
	.then(function (): Promise<string> {
		rootModule.register(fastify);

		events.set('AUTH', authEvent);
		events.set('CREATE_CHAT', createChatEvent);
		events.set('CREATE_MESSAGE', createMessageEvent);

		return fastify.listen({
			host: '0.0.0.0',
			port: Number.parseInt(process['env']['PORT'], 10)
		});
	}, fastify['log'].fatal)
	.then(function (): void {
		const printRoute: string = fastify.printRoutes({
			commonPrefix: false
		});

		fastify['log'].info('Route tree:');

		for(let start: number = 0, end: number = 0; end <= printRoute['length']; end++) {
			if(end !== printRoute['length'] && printRoute[end] !== '\n' || end - start == 0) {
				continue;
			}

			fastify['log'].info(printRoute.slice(start + 4, end));

			start = end + 1;
		}

		fastify['log'].info('Event list:');

		for(const eventName of events.keys()) {
			fastify['log'].info('- ' + eventName);
		}
	}, fastify['log'].fatal);