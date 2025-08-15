import { kysely } from '@library/database';
import { Database, Group, GroupTag, Media, Tag } from '@library/type';
import { FastifyReply, FastifyRequest } from 'fastify';
import { sql, Transaction } from 'kysely';

export default function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
	return kysely.transaction()
		.setAccessMode('read only')
		.setIsolationLevel('repeatable read')
		.execute(function (transaction: Transaction<Database>): Promise<void> {
			const groups: (Pick<Group, 'id' | 'name' | 'startAt' | 'createdAt'> & {
				media: Pick<Media, 'hash' | 'type'>;
				tags: string[];
			})[] = [];

			return transaction.selectFrom('group')
				.select(['group.id', 'group.name', 'group.start_at as startAt', 'group.created_at as createdAt'])
				.innerJoin('media', 'group.media_id', 'media.id')
				.select(['media.hash', 'media.type'])
				.where('group.deleted_at', 'is', null)
				.orderBy('group.id', 'desc')
				.execute()
				.then(function (groupAndMedias: Pick<Group & Media, 'id' | 'name' | 'startAt' | 'createdAt' | 'hash' | 'type'>[]): Promise<Pick<Tag & GroupTag, 'name' | 'groupId'>[]> | [] {
					if(groupAndMedias['length'] === 0) {
						return [];
					}

					const groupIds: number[] = [];

					for(let i: number = 0; i < groupAndMedias['length']; i++) {
						groupIds.push(groupAndMedias[i]['id']);
						groups.push({
							id: groupAndMedias[i]['id'],
							name: groupAndMedias[i]['name'],
							startAt: groupAndMedias[i]['startAt'],
							createdAt: groupAndMedias[i]['createdAt'],
							media: {
								hash: groupAndMedias[i]['hash'],
								type: groupAndMedias[i]['type']
							},
							tags: []
						});
					}

					return transaction.selectFrom('tag')
						.select('tag.name')
						.innerJoin('group_tag', 'tag.id', 'group_tag.tag_id')
						.select('group_tag.group_id as groupId')
						.where('group_tag.group_id', 'in', groupIds)
						.orderBy(sql`array_position(array(${groupIds.join(',')}), groupId)`)
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