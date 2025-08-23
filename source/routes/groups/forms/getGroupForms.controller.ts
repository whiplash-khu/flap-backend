import { kysely } from '@library/database';
import { NotFound, Unauthorized } from '@library/httpError';
import { Database, Pagenation, User, Media, Form, Group } from '@library/type';
import { FastifyReply, FastifyRequest } from 'fastify';
import { SelectQueryBuilder, Transaction } from 'kysely';

export default function (request: FastifyRequest<{
	Querystring: Pagenation;
	Params: {
		groupId: Form['groupId'];
	};
}>, reply: FastifyReply): Promise<void> {
	return kysely.transaction()
		.setAccessMode('read only')		 
		.setIsolationLevel('repeatable read')
		.execute(function (transaction: Transaction<Database>): Promise<void> {
      const forms: ({
        id: Form['id'];
        createdAt: Form['createdAt'];
        user: Pick<User, 'id' | 'name'> & {
          media: Pick<Media, 'id' | 'hash' | 'type'>;
        };
      })[] = [];

      return transaction.selectFrom('group')
        .select('group.user_id as userId')
        .where('group.id', '=', request['params']['groupId'])
        .where('group.deleted_at', 'is', null)
        .executeTakeFirst()
        .then(function (group?: Pick<Group, 'userId'>) {
          if(group === undefined) {
            throw new NotFound('Params["groupId"] must be valid');
          }

          if(group['userId'] !== request['userId']) {
            throw new Unauthorized('User must be group owner');
          }

					return transaction.selectFrom('form')
						.innerJoin('user', 'form.user_id', 'user.id')
						.innerJoin('media', 'user.media_id', 'media.id')
            .select([
              'form.id as id',
              'form.created_at as createdAt',
              'user.id as userId',
              'user.name as name',
              'media.id as mediaId',
              'media.hash as hash',
              'media.type as type'
            ])
						.where('form.group_id', '=', request['params']['groupId'])
						.$if(typeof request['query']['index'] === 'number', function (queryBuilder: SelectQueryBuilder<Database, 'form' | 'user' | 'media', Pick<Form & User & Media, 'id' | 'createdAt' | 'userId' | 'name' | 'mediaId' | 'hash' | 'type'>>): SelectQueryBuilder<Database, 'form' | 'user' | 'media', Pick<Form & User & Media, 'id' | 'createdAt' | 'userId' | 'name' | 'mediaId' | 'hash' | 'type'>> {
							return queryBuilder.where('form.id', '<', request['query']['index'] as number);
						}) 
            .orderBy('form.id', 'desc')
            .limit(request['query']['size'])
						.execute();
				})
        .then(function (_forms: Pick<Form & User & Media, 'id' | 'createdAt' | 'userId' | 'name' | 'mediaId' | 'hash' | 'type'>[]){
          for(let i: number = 0; i < _forms['length']; i++) {
            forms.push({
              id: _forms[i]['id'],
              createdAt: _forms[i]['createdAt'],
              user: {
                id: _forms[i]['userId'],
                name: _forms[i]['name'],
                media: {
                  id: _forms[i]['mediaId'],
                  hash: _forms[i]['hash'],
                  type: _forms[i]['type']
                }
              }
            })
          }
          reply.send(forms);
        });
		});
}