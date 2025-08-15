import { TAG_REGULAR_EXPRESSION } from '@library/constant';
import { createTags, isMediaValid, kysely } from '@library/database';
import { BadRequest } from '@library/httpError';
import { Database, Group, GroupQuestion, GroupQuestionTable, GroupTagTable, Tag } from '@library/type';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Insertable, InsertResult, Transaction } from 'kysely';

export default function (request: FastifyRequest<{
	Body: Pick<Group, | 'name' | 'introduction' | 'description' | 'startAt' | 'endAt'> & Partial<Pick<Group, 'mediaId'>> & {
		questions: GroupQuestion['content'][];
	};
}>, reply: FastifyReply): Promise<void> {
	if(request['body']['startAt'] > request['body']['endAt']) {
		throw new BadRequest('Body["startAt"] must be earlier than Body["endAt"]');
	}

	return kysely.transaction()
		.setAccessMode('read write')
		.setIsolationLevel('serializable')
		.execute(function (transaction: Transaction<Database>): Promise<void> {
			let groupId: Group['id'];

			request['body']['mediaId'] ||= 0;

			return isMediaValid(transaction, request['body']['mediaId'])
				.then(function (isMediaValid: boolean): Promise<Pick<Group, 'id'>> {
					if(!isMediaValid) {
						throw new BadRequest('Body["mediaId"] must be valid');
					}

					return transaction.insertInto('group')
						.values({
							user_id: request['userId'],
							media_id: request['body']['mediaId'] as number,
							name: request['body']['name'],
							introduction: request['body']['introduction'],
							description: request['body']['description'],
							start_at: request['body']['startAt'],
							end_at: request['body']['endAt']
						})
						.returning('id')
						.executeTakeFirstOrThrow();
				})
				.then(function (group: Pick<Group, 'id'>): Promise<Pick<Tag, 'id'>[]> {
					groupId = group['id'];

					return createTags(transaction, TAG_REGULAR_EXPRESSION.exec(request['body']['introduction']) || []);
				})
				.then(function (tags: Pick<Tag, 'id'>[]): Promise<(InsertResult[] | InsertResult)[]> {
					const groupTagInserts: Insertable<GroupTagTable>[] = [];
					const groupQuestionInserts: Insertable<GroupQuestionTable>[] = [];

					for(let i: number = 0; i < tags['length']; i++) {
						groupTagInserts.push({
							group_id: groupId,
							tag_id: tags[i]['id']
						});
					}

					for(let i: number = 0; i < request['body']['questions']['length']; i++) {
						groupQuestionInserts.push({
							group_id: groupId,
							content: request['body']['questions'][i]
						});
					}

					return Promise.all([transaction.insertInto('group_tag')
						.values(groupTagInserts)
						.execute(), transaction.insertInto('group_question')
						.values(groupQuestionInserts)
						.execute(), transaction.insertInto('group_user')
						.values({
							group_id: groupId,
							user_id: request['userId']
						})
						.executeTakeFirstOrThrow()]);
				})
				.then(function (): void {
					reply.send({
						id: groupId
					});
				});
		});
}