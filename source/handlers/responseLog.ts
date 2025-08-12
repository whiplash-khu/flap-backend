import { DoneFuncWithErrOrRes, FastifyReply, FastifyRequest } from 'fastify';

export default function responseLogHandler(request: FastifyRequest, reply: FastifyReply, done: DoneFuncWithErrOrRes): void {
	request['log'].info(request['ip'] + ' "' + request['method'] + ' ' + decodeURIComponent(request['url']) + ' HTTP/' + request['raw']['httpVersion'] + '" ' + reply['statusCode'] + ' "' + request['headers']['user-agent'] + '" (' + Math.trunc(reply['elapsedTime'] * 100) / 100 + 'ms)');

	done();
}