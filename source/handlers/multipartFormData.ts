import { BadRequest, HttpError, PayloadTooLarge, UnsupportedMediaType } from '@library/httpError';
import { FastifyRequest } from 'fastify';
import { ContentTypeParserDoneFunction } from 'fastify/types/content-type-parser';
import { IncomingMessage } from 'http';
import Busboy, { BusboyFileStream, BusboyHeaders } from '@fastify/busboy';
import { createHash, Hash } from 'crypto';
import { FILE_SIZE_LIMIT, SUPPORTED_MIME_TYPES } from '@library/constant';

export default function multipartFormDataHandler(request: FastifyRequest, payload: IncomingMessage, done: ContentTypeParserDoneFunction): void {
	if(request['method'] !== 'POST' || request['url'] !== '/medias') {
		done(new UnsupportedMediaType('Headers["content-type"] must not be multipart'));

		return;
	}

	try {
		let error: Error | undefined;

		payload.pipe(new Busboy({
			headers: payload['headers'] as BusboyHeaders,
			limits: {
				files: 1,
				fileSize: FILE_SIZE_LIMIT
			}
		}).on('file', function (fieldName: string, stream: BusboyFileStream, fileName: string, transferEncoding: string, mimeType: string): void {
			if(!SUPPORTED_MIME_TYPES.has(mimeType)) {
				error ||= new UnsupportedMediaType('File mime type must be one of ' + Array.from(SUPPORTED_MIME_TYPES).join('", "'));
			}

			if(error !== undefined) {
				stream.resume();

				return;
			}

			const hash: Hash = createHash('sha512');
			const chunks: Buffer[] = [];

			stream.on('data', function (chunk: Buffer): void {
				hash.update(chunk);
				chunks.push(chunk);
			})
				.once('limit', function (): void {
					error ||= new PayloadTooLarge('File must be smaller than ' + FILE_SIZE_LIMIT + ' bytes');
				})
				.once('end', function (): void {
					if(chunks['length'] === 0) {
						error ||= new BadRequest('File must exist');
					}

					if(error !== undefined) {
						return;
					}

					request['file'] = {
						hash: hash.digest('hex'),
						buffer: Buffer.concat(chunks),
						mimeType: mimeType
					};
				});
		})
			.once('error', function (_error: unknown): void {
				if(_error instanceof Error) {
					error = _error;

					return;
				}

				error = new BadRequest(String(_error));
			})
			.once('filesLimit', function (): void {
				error ||= new BadRequest('File must be single');
			})
			.once('finish', function (): void {
				if(error === undefined) {
					done(null);

					return;
				}

				if(error instanceof HttpError) {
					done(error);

					return;
				}

				done(new BadRequest(error instanceof Error ? error['message'] : String(error)));
			}));
	} catch(error: unknown) {
		if(error instanceof Error) {
			done(new BadRequest(error['message']));

			return;
		}

		done(new BadRequest(String(error)));
	}
}