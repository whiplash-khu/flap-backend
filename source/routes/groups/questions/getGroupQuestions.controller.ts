import { kysely } from '@library/database';
import { NotFound } from '@library/httpError';
import { Database, GroupQuestion } from '@library/type';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Transaction } from 'kysely';

export default function (request: FastifyRequest<{
	Params: {
		groupId: GroupQuestion['groupId'];
	};
}>, reply: FastifyReply): Promise<void> {
	return kysely.transaction()
		.setAccessMode('read only')		 
		.setIsolationLevel('repeatable read')
		.execute(function (transaction: Transaction<Database>): Promise<void> {
			return transaction.selectFrom('group')
        .where('group.id', '=', request['params']['groupId'])
        .where('group.deleted_at', 'is', null)
        .executeTakeFirst()
        .then(function (group): Promise<{ id: number; content: string }[]> {
          if(group === undefined) {
            throw new NotFound('Params["groupId"] must be valid');
          }

          return transaction.selectFrom('group_question')
            .select([
							'id',
							'content'
						])
            .where('group_question.group_id', '=', request['params']['groupId'])
            .orderBy('id', 'asc')
            .execute();
        })
        .then(function (questions: Array<Pick<GroupQuestion, 'id' | 'content'>>): void {
          reply.send(questions);
        });
		});
}