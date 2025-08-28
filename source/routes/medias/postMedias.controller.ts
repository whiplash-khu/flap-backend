import { PutObjectCommand, PutObjectCommandOutput } from '@aws-sdk/client-s3';
import { kysely, s3 } from '@library/database';
import { Database, Media } from '@library/type';
import { getPreciseEpoch, getTimestamp } from '@library/time';
import { FastifyReply, FastifyRequest } from 'fastify';
import { OnConflictBuilder, OnConflictUpdateBuilder, sql, Transaction } from 'kysely';

export default function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
	return kysely.transaction()
		.setAccessMode('read write')
		.setIsolationLevel('serializable')
		.execute(function (transaction: Transaction<Database>): Promise<void> {
			let mediaId: Media['id'];
			const now: number = getPreciseEpoch();

			return transaction.insertInto('media')
				.values({
					hash: request['file']['hash'],
					type: request['file']['mimeType'],
					created_at: getTimestamp(now)
				})
				.onConflict(function (builder: OnConflictBuilder<Database, 'media'>): OnConflictUpdateBuilder<Database, 'media'> {
					return builder.column('hash')
						.doUpdateSet({
							hash: sql`excluded.hash`
						});
				})
				.returning([
					'id',
					sql<number>`extract(epoch from created_at)`.as('createdAt')
				])
				.executeTakeFirstOrThrow()
				.then(function (media: Pick<Media, 'id'> & {
					createdAt: number;
				}): Promise<PutObjectCommandOutput> | undefined {
					mediaId = media['id'];

					if(now !== media['createdAt']) {
						return;
					}

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