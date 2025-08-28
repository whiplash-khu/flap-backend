import { kysely } from '@library/database';
import { Database, Group, GroupTag, Media, Pagenation, Tag } from '@library/type';
import { FastifyReply, FastifyRequest } from 'fastify';
import { QueryCreator, SelectQueryBuilder, sql, Transaction } from 'kysely';

export default function (request: FastifyRequest<{
	Querystring: Pagenation;
}>, reply: FastifyReply): Promise<void> {
	return kysely.transaction()
		.setAccessMode('read only')
		.setIsolationLevel('repeatable read')
		.execute(function (transaction: Transaction<Database>): Promise<void> {
			const groups: (Pick<Group, 'id' | 'name' | 'startAt' | 'createdAt'> & {
				media: Pick<Media, 'hash' | 'type'>;
				tags: Tag['name'][];
			})[] = [];

			return transaction.selectFrom('group')
				.select([
					'group.id',
					'group.media_id as mediaId',
					'group.name',
					'group.start_at as startAt',
					'group.created_at as createdAt'
				])
				.innerJoin('media', 'group.media_id', 'media.id')
				.select([
					'media.hash',
					'media.type'
				])
				.where('group.deleted_at', 'is', null)
				.$if(typeof request['query']['index'] === 'number', function (queryBulder: SelectQueryBuilder<Database, 'group' | 'media', Pick<Group & Media, 'id' | 'name' | 'startAt' | 'createdAt' | 'mediaId' | 'hash' | 'type'>>): typeof queryBulder {
					return queryBulder.where('group.id', '<', request['query']['index'] as number);
				})
				.orderBy('group.id', 'desc')
				.limit(request['query']['size'])
				.execute()
				.then(function (groupWithMedias: Pick<Group & Media, 'id' | 'name' | 'startAt' | 'createdAt' | 'hash' | 'type'>[]): Promise<Pick<Tag & GroupTag, 'name' | 'groupId'>[]> | [] {
					if(groupWithMedias['length'] === 0) {
						return [];
					}

					const groupIds: number[] = [];

					for(let i: number = 0; i < groupWithMedias['length']; i++) {
						groupIds.push(groupWithMedias[i]['id']);
						groups.push({
							id: groupWithMedias[i]['id'],
							name: groupWithMedias[i]['name'],
							startAt: groupWithMedias[i]['startAt'],
							createdAt: groupWithMedias[i]['createdAt'],
							media: {
								hash: groupWithMedias[i]['hash'],
								type: groupWithMedias[i]['type']
							},
							tags: []
						});
					}

					return transaction.with('_tag', function (queryCreator: QueryCreator<Database>): SelectQueryBuilder<Database, 'tag' | 'group_tag', Pick<Tag & GroupTag, 'name' | 'groupId'> & {
						rowNumber: number;
					}> {
						return queryCreator.selectFrom('tag')
							.select('tag.name')
							.innerJoin('group_tag', 'tag.id', 'group_tag.tag_id')
							.select(sql<number>`row_number() over (partition by group_tag.group_id)`.as('rowNumber'))
							.select('group_tag.group_id as groupId')
							.where('group_tag.group_id', 'in', groupIds)
							.orderBy(sql`array_position(array[${sql.raw(groupIds.join(','))}],group_id)`);
						})
						.selectFrom('_tag')
						.select([
							'_tag.name',
							'_tag.groupId'
						])
						.where("_tag.rowNumber", '<', 4)
						.execute();
				})
				.then(function (tags: Pick<Tag & GroupTag, 'name' | 'groupId'>[]): void {
					if(tags['length'] !== 0) {
						for(let i: number = 0, j: number = 0; i < tags['length']; i++) {
							if(i !== 0 && tags[i - 1]['groupId'] !== tags[i]['groupId']) {
								j++;
							}

							groups[j]['tags'].push(tags[i]['name']);
						}
					}

					reply.send(groups);
				});
		});
}