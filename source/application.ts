import '@library/environment';
import Logger from '@library/logger';
import errorHandler from '@handlers/error';
import headerHandler from '@handlers/header';
import notFoundHandler from '@handlers/notFound';
import serializeHandler from '@handlers/serialize';
import fastify, { FastifyInstance } from 'fastify';
import rootModule from './routes/root.module';
import responseLogHandler from '@handlers/responseLog';

const instance: FastifyInstance = fastify({
	trustProxy: true,
	exposeHeadRoutes: false,
	disableRequestLogging: true,
	loggerInstance: new Logger()
});

instance.setNotFoundHandler(notFoundHandler);
instance.setErrorHandler(errorHandler);
instance.setReplySerializer(serializeHandler);
instance.addHook('preHandler', headerHandler);
instance.addHook('onResponse', responseLogHandler);

rootModule.register(instance);

instance.listen({
	host: '0.0.0.0',
	port: Number.parseInt(process['env']['PORT'], 10)
})
.then(function (): void {
	const printRoute: string = instance.printRoutes({
		commonPrefix: false
	});

	instance['log'].info('Route tree:');

	for(let start: number = 0, end: number = 0; end <= printRoute['length']; end++) {
		if(end !== printRoute['length'] && printRoute[end] !== '\n' || end - start == 0) {
			continue;
		}

		instance['log'].info(printRoute.slice(start + 4, end));

		start = end + 1;
	}
})
.catch(instance['log'].fatal);