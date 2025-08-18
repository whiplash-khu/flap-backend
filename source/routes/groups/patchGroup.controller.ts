import { TAG_REGULAR_EXPRESSION } from '@library/constant';
import { createTags, kysely, selectEmptyMedia } from '@library/database';
import { BadRequest, NotFound, Unauthorized } from '@library/httpError';
import { Database, Group, GroupTagTable, Tag } from '@library/type';
import { FastifyReply, FastifyRequest } from 'fastify';
import { DeleteResult, Insertable, InsertResult, OnConflictBuilder, OnConflictDoNothingBuilder, SelectQueryBuilder, Transaction, UpdateResult } from 'kysely';

export default function (request: FastifyRequest<{
	Params: {
		groupId: Group['id'];
	};
	Body: Pick<Group, | 'name' | 'introduction' | 'description' | 'endAt'> & Partial<Pick<Group, 'mediaId'>>;
}>, reply: FastifyReply): Promise<void> {
	return kysely.transaction()
		.setAccessMode('read write')
		.setIsolationLevel('serializable')
		.execute(function (transaction: Transaction<Database>): Promise<void> {
			const shouldUpdateEndAt: boolean = request['body']['endAt'] !== undefined;

			return transaction.selectFrom('group')
				.select('user_id as userId')
				.$if(shouldUpdateEndAt, function (queryBuilder: SelectQueryBuilder<Database, 'group', Pick<Group, 'userId'>>): SelectQueryBuilder<Database, 'group', Pick<Group, 'userId' | 'startAt'>> {
					return queryBuilder.select('start_at as startAt');
				})
				.where('id', '=', request['params']['groupId'])
				.where('deleted_at', 'is', null)
				.executeTakeFirst()
				.then(function (group?: Pick<Group, 'userId'> & Partial<Pick<Group, 'startAt'>>): Promise<{} | undefined> {
					if(group === undefined) {
						throw new NotFound('Prams["groupId"] must be valid');
					}

					if(group['userId'] !== request['userId']) {
						throw new Unauthorized('Group["userId"] must be yourself');
					}

					if(shouldUpdateEndAt && group['startAt'] as Date > request['body']['endAt']) {
						throw new BadRequest('Group["startAt"] must be earlier than Body["endAt"]');
					}

					return selectEmptyMedia(transaction, request['body']['mediaId'] || 0);
				})
				.then(function (media?: {}): Promise<UpdateResult> {
					if(media === undefined) {
						throw new BadRequest('Body["mediaId"] must be valid');
					}

					return transaction.updateTable('group')
						.set({
							media_id: request['body']['mediaId'],
							name: request['body']['name'],
							introduction: request['body']['introduction'],
							description: request['body']['description'],
							end_at: request['body']['endAt']
						})
						.where('id', '=', request['params']['groupId'])
						.executeTakeFirstOrThrow();
				})
				.then(function (): Promise<(DeleteResult | InsertResult)[]> | undefined {
					if(request['body']['introduction'] === undefined) {
						return;
					}

					return createTags(transaction, TAG_REGULAR_EXPRESSION.exec(request['body']['introduction']) || [])
					.then(function (tags: Pick<Tag, 'id'>[]): Promise<(DeleteResult | InsertResult)[]> {
						const tagIds: Tag['id'][] = [];
						const groupTagInserts: Insertable<GroupTagTable>[] = [];

						for(let i: number = 0; i < tags['length']; i++) {
							tagIds.push(tags[i]['id']);
							groupTagInserts.push({
								group_id: request['params']['groupId'],
								tag_id: tags[i]['id']
							});
						}

						return Promise.all([
							transaction.deleteFrom('group_tag')
								.where('group_id', '=', request['params']['groupId'])
								.where('tag_id', 'not in', tagIds)
								.executeTakeFirstOrThrow(),
							transaction.insertInto('group_tag')
								.values(groupTagInserts)
								.onConflict(function (builder: OnConflictBuilder<Database, 'group_tag'>): OnConflictDoNothingBuilder<Database, 'group_tag'> {
									return builder.column('tag_id')
										.doNothing();
								})
								.executeTakeFirstOrThrow()
						]);
					});
				})
				.then(function (): void {
					reply.status(204)
						.send();
				});
		});
}