import { PutObjectCommand, PutObjectCommandOutput } from '@aws-sdk/client-s3';
import { kysely, s3 } from '@library/database';
import { Database, Media } from '@library/type';
import getEpoch from '@library/utility';
import { FastifyReply, FastifyRequest } from 'fastify';
import { sql, Transaction } from 'kysely';

export default function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
	return kysely.transaction()
		.setAccessMode('read write')
		.setIsolationLevel('serializable')
		.execute(function (transaction: Transaction<Database>): Promise<void> {
			let mediaId: Media['id'];
			const now: number = getEpoch();

			return transaction.insertInto('media')
				.values({
					hash: request['file']['hash'],
					type: request['file']['mimeType'],
					created_at: sql`to_timestamp(${now})`
				})
				.returning(['id', 'created_at as createdAt'])
				.executeTakeFirstOrThrow()
				.then(function (media: Pick<Media, 'id' | 'createdAt'>): Promise<PutObjectCommandOutput> | undefined {
					if(now !== getEpoch(media['createdAt'])) {
						console.log('dupe');

						return;
					}

					mediaId = media['id'];

					return s3.send(new PutObjectCommand({
						Bucket: process['env']['STORAGE_BUCKET_NAME'],
						Key: request['file']['hash'],
						Body: request['file']['buffer'],
						ContentType: request['file']['mimeType']
					}));
				})
				.then(function (): void {
					reply.send({
						id: mediaId
					});
				});
		});
}