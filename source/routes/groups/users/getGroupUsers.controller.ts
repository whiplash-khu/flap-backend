import { kysely } from '@library/database';
import { NotFound, Unauthorized } from '@library/httpError';
import { Database, GroupUser, Media, Pagenation, User } from '@library/type';
import { FastifyReply, FastifyRequest } from 'fastify';
import { JoinBuilder, Nullable, SelectQueryBuilder, Transaction } from 'kysely';

export default function (request: FastifyRequest<{
	Params: Pick<GroupUser, 'groupId'>;
	Querystring: Pagenation;
}>, reply: FastifyReply): Promise<void> {
	return kysely.transaction()
		.setAccessMode('read only')
		.setIsolationLevel('repeatable read')
		.execute(function (transaction: Transaction<Database>): Promise<void> {
			return transaction.selectFrom('group')
				.leftJoin('group_user', function (joinBuilder: JoinBuilder<Database, 'group' | 'group_user'>): typeof joinBuilder {
					return joinBuilder.onRef('group.id', '=', 'group_user.group_id')
						.on('group_user.user_id', '=', request['userId']);
				})
				.select('group_user.user_id as userId')
				.where('group.id', '=', request['params']['groupId'])
				.where('group.deleted_at', 'is', null)
				.executeTakeFirst()
				.then(function (groupWithUser?: Nullable<Pick<GroupUser, 'userId'>>): Promise<Pick<User & Media, 'id' | 'name' | 'school' | 'mediaId' | 'hash' | 'type'>[]> {
					if(groupWithUser === undefined) {
						throw new NotFound('Params["groupId"] must be valid');
					}

					if(groupWithUser['userId'] === null) {
						throw new Unauthorized('User must be in group');
					}

					return transaction.selectFrom('group_user')
						.innerJoin('user', 'group_user.user_id', 'user.id')
						.select(['user.id', 'user.media_id as mediaId', 'user.name', 'user.school'])
						.innerJoin('media', 'user.media_id', 'media.id')
						.select(['media.hash', 'media.type'])
						.where('group_user.group_id', '=', request['params']['groupId'])
						.where('user.deleted_at', 'is', null)
						.$if(typeof request['query']['index'] === 'number', function (queryBulder: SelectQueryBuilder<Database, "group_user" | "media" | "user", Pick<User & Media, 'id' | 'name' | 'school' | 'mediaId' | 'hash' | 'type'>>): typeof queryBulder {
							return queryBulder.where('group_user.id', '<', request['query']['index'] as number);
						})
						.limit(request['query']['size'])
						.execute();
				})
				.then(function (_groupUsers: Pick<User & Media, 'id' | 'name' | 'school' | 'mediaId' | 'hash' | 'type'>[]) {
					const groupUsers: (Pick<User, 'id' | 'name' | 'school'> & {
						media: Pick<Media, 'id' | 'hash' | 'type'>;
					})[] = [];

					for(let i: number = 0; i < _groupUsers['length']; i++) {
						groupUsers.push({
							id: _groupUsers[i]['id'],
							name: _groupUsers[i]['name'],
							school: _groupUsers[i]['school'],
							media: {
								id: _groupUsers[i]['mediaId'],
								hash: _groupUsers[i]['hash'],
								type: _groupUsers[i]['type']
							}
						});
					}

					reply.send(groupUsers);
				});
		})
}