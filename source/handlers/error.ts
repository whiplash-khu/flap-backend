import { IS_DEVELOPMENT } from '@library/constant';
import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';

export default function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply): void {
	if(typeof error['validation'] === 'object') {
		error['statusCode'] = 400;
		error['message'] = error['message'][0].toUpperCase() + error['message'].slice(1);
	}

	if(typeof error['statusCode'] !== 'number') {
		error['statusCode'] = 500;
	}

	error['stack'] = typeof error['stack'] === 'string' ? error['stack'].replace(/\n\s+/g, '; ') : '';

	const isClientError: boolean = error['statusCode'] < 500;

	if(!isClientError) {
		request['server']['log'].warn(error['stack']);
	}

	reply.status(error['statusCode'])
	.header('Access-Control-Allow-Origin', '*')
	.send(isClientError ? {
		status: 'fail',
		data: Object.assign({
			title: error['message']
		}, IS_DEVELOPMENT ? {
			body: error['stack']
		} : undefined)
	} : {
		status: 'error',
		message: error['message'] + (IS_DEVELOPMENT ? '; ' + error['stack'] : '')
	});
}