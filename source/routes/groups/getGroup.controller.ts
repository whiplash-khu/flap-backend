import { kysely } from '@library/database';
import { NotFound } from '@library/httpError';
import { Database, Group, GroupUser } from '@library/type';
import { FastifyReply, FastifyRequest } from 'fastify';
import { JoinBuilder, Nullable, SelectQueryBuilder, Transaction } from 'kysely';

export default function (request: FastifyRequest<{
	Params: {
		groupId: Group['id'];
	}
}>, reply: FastifyReply): Promise<void> {
	return kysely.transaction()
		.setAccessMode('read only')
		.setIsolationLevel('repeatable read')
		.execute(function (transaction: Transaction<Database>): Promise<void> {
			return transaction.selectFrom('group')
				.select('group.id')
				.leftJoin('group_user', function (joinBuilder: JoinBuilder<Database, 'group' | 'group_user'>): typeof joinBuilder {
					return joinBuilder.onRef('group.id', '=', 'group_user.group_id')
						.on('group_user.user_id', '=', request['userId']);
				})
				.select('group_user.user_id as userId')
				.where('group.id', '=', request['params']['groupId'])
				.executeTakeFirst()
				.then(function (groupWithUser?: Nullable<Pick<GroupUser, 'userId'>>): Promise<Pick<Group, 'id' | 'name' | 'description' | 'startAt' | 'endAt'> & Partial<Pick<Group, 'introduction' | 'userId' | 'createdAt'>>> {
					if(groupWithUser === undefined) {
						throw new NotFound('Params["groupId"] must be valid');
					}

					return transaction.selectFrom('group')
						.select([
							'group.id',
							'group.name',
							'group.description',
							'group.start_at as startAt',
							'group.end_at as endAt'
						])
						.$if(typeof groupWithUser['userId'] === 'number', function (queryBulder: SelectQueryBuilder<Database, "group", Pick<Group, 'id' | 'name' | 'description' | 'startAt' | 'endAt'>>): typeof queryBulder {
							return queryBulder.select([
								'group.user_id as userId',
								'group.introduction',
								'group.created_at as createdAt'
							]);
						})
						.where('group.id', '=', request['params']['groupId'])
						// repeatable read
						.executeTakeFirstOrThrow();
				})
				.then(function (group: Pick<Group, 'id' | 'name' | 'description' | 'startAt' | 'endAt'> & Partial<Pick<Group, 'introduction' | 'userId' | 'createdAt'>>): void {
					reply.send(group);
				});
		});
}