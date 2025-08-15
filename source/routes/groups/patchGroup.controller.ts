import { TAG_REGULAR_EXPRESSION } from '@library/constant';
import { createTags, isMediaValid, kysely } from '@library/database';
import { BadRequest, NotFound, Unauthorized } from '@library/httpError';
import { Database, Group, GroupTagTable, Tag } from '@library/type';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Insertable, InsertResult, OnConflictBuilder, OnConflictDoNothingBuilder, SelectQueryBuilder, sql, Transaction, UpdateResult } from 'kysely';

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
				.then(function (group?: Pick<Group, 'userId'> & Partial<Pick<Group, 'startAt'>>): Promise<boolean> {
					if(group === undefined) {
						throw new NotFound('Prams["groupId"] must be valid');
					}

					if(group['userId'] !== request['userId']) {
						throw new Unauthorized('Group["userId"] must be yourself');
					}

					if(shouldUpdateEndAt && group['startAt'] as Date > request['body']['endAt']) {
						throw new BadRequest('Group["startAt"] must be earlier than Body["endAt"]');
					}

					return isMediaValid(transaction, request['body']['mediaId'] || 0);
				})
				.then(function (isMediaValid: boolean): Promise<UpdateResult> {
					if(!isMediaValid) {
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
						.executeTakeFirst();
				})
				.then(function (): Promise<InsertResult[] | undefined> | undefined {
					if(request['body']['introduction'] === undefined) {
						return;
					}

					const tagNames: Tag['name'][] = TAG_REGULAR_EXPRESSION.exec(request['body']['introduction']) || [];

					return transaction.selectFrom('group_tag')
						.select(kysely.fn<number>('count', [sql`*`]).as('count'))
						.innerJoin('tag', 'group_tag.tag_id', 'tag.id')
						.where('group_tag.group_id', '=', request['params']['groupId'])
						.where('tag.name', 'in', tagNames)
						.executeTakeFirstOrThrow()
						.then(function (row: {
							count: number;
						}): Promise<InsertResult[]> | undefined {
							if(row['count'] === tagNames['length']) {
								return;
							}

							return transaction.deleteFrom('group_tag')
							.innerJoin('tag', 'group_tag.tag_id', 'tag.id')
							.where('group_tag.group_id', '=', request['params']['groupId'])
							.where('tag.name', 'not in', tagNames)
							.executeTakeFirstOrThrow()
							.then(function (): Promise<Pick<Tag, 'id'>[]> {
								return createTags(transaction, tagNames);
							})
							.then(function (tags: Pick<Tag, 'id'>[]): Promise<InsertResult[]> {
								const groupTagInserts: Insertable<GroupTagTable>[] = [];
		
								for(let i: number = 0; i < tags['length']; i++) {
									groupTagInserts.push({
										group_id: request['params']['groupId'],
										tag_id: tags[i]['id']
									});
								}
		
								return transaction.insertInto('group_tag')
									.values(groupTagInserts)
									.onConflict(function (builder: OnConflictBuilder<Database, 'group_tag'>): OnConflictDoNothingBuilder<Database, 'group_tag'> {
										return builder.column('tag_id')
											.doNothing();
									})
									.execute();
							});
						})
				})
				.then(function (): void {
					reply.status(204)
						.send();
				});
		});
}