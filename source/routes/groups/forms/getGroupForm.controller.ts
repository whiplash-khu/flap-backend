import { kysely } from '@library/database';
import { NotFound, Unauthorized } from '@library/httpError';
import { Database, Pagenation, FormAnswer, Form, Group } from '@library/type';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Transaction } from 'kysely';

export default function (request: FastifyRequest<{
	Querystring: Pagenation;
	Params: {
		groupId: Form['groupId'];
    formId: Form['id'];
	};
}>, reply: FastifyReply): Promise<void> {
	return kysely.transaction()
		.setAccessMode('read only')		 
		.setIsolationLevel('repeatable read')
		.execute(function (transaction: Transaction<Database>): Promise<void> {
      return transaction.selectFrom('group')
        .select('group.user_id as userId')
        .innerJoin('form', 'form.group_id', 'group.id')
        .where('group.id', '=', request['params']['groupId'])
        .where('form.id', '=', request['params']['formId'])
        .where('group.deleted_at', 'is', null)
        .executeTakeFirst()
        .then(function (group?: Pick<Group, 'userId'>) {
          if(group === undefined) {
            throw new NotFound('Params["groupId"] must be valid');
          }

          if(group['userId'] !== request['userId']) {
            throw new Unauthorized('User must be group owner');
          }
          
          return transaction.selectFrom('form_answer')
            .select(['id', 'content'])
            .where('form_answer.form_id', '=', request['params']['formId'])
            .orderBy('id', 'asc')
            .execute();
				})
        .then(function (formAnswers: Pick<FormAnswer, 'id' | 'content'>[]): void {
          reply.send(formAnswers);
        });
		});
}