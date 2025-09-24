import { kysely } from '@library/database';
import { NotFound, Unauthorized } from '@library/httpError';
import { Database, Pagenation, FormAnswer, Form, Group, User, Media } from '@library/type';
import { FastifyReply, FastifyRequest } from 'fastify';
import { JoinBuilder, Nullable, Transaction } from 'kysely';

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
			let form: Pick<Form, 'id' | 'createdAt'> & {
				user: Pick<User, 'id' | 'name' | 'school' | 'admissionYear' | 'birthdate' | 'isMale'> & {
					media: Pick<Media, 'id' | 'hash' | 'type'>;
				};
			};

      return transaction.selectFrom('group')
        .select('group.user_id as userId')
				.leftJoin('form', function (joinBuilder: JoinBuilder<Database, 'group' | 'form'>): typeof joinBuilder {
					return joinBuilder
						.onRef('group.id', '=', 'form.group_id');
				})
				.select([
					'form.id as formId',
					'form.created_at as createdAt'
				])
				.leftJoin('user', function (joinBuilder: JoinBuilder<Database, 'group' | 'form' | 'user'>): typeof joinBuilder {
					return joinBuilder
						.onRef('form.user_id', '=', 'user.id');
				})
				.select([
					'user.id as _userId',
					'user.media_id as mediaId',
					'user.name as name',
					'user.school',
					'user.admission_year as admissionYear',
					'user.birthdate',
					'user.is_male as isMale'
				])
				.leftJoin('media', function (joinBuilder: JoinBuilder<Database, 'group' | 'form' | 'user' | 'media'>): typeof joinBuilder {
					return joinBuilder
						.onRef('user.media_id', '=', 'media.id');
				})
				.select([
					'media.hash',
					'media.type'
				])
        .where('group.id', '=', request['params']['groupId'])
        .where('group.deleted_at', 'is', null)
        .executeTakeFirst()
        .then(function (groupWithForm?: Pick<Group, 'userId'> & Nullable<{
					formId: Form['id'];
					createdAt: Form['createdAt'];
					_userId: User['id'];
					mediaId: User['mediaId'];
					name: User['name'];
					school: User['school'];
					admissionYear: User['admissionYear'];
					birthdate: User['birthdate'];
					isMale: User['isMale'];
					hash: Media['hash'];
					type: Media['type'];
				}>): Promise<Pick<FormAnswer, 'id' | 'content'>[]> {
          if(groupWithForm === undefined) {
            throw new NotFound('Params["groupId"] must be valid');
          }

					if(groupWithForm['formId'] === null) {
            throw new NotFound('Params["formId"] must be valid');
					}

          if(groupWithForm['userId'] !== request['userId']) {
            throw new Unauthorized('User must be group owner');
          }

					form = {
						id: groupWithForm['formId'],
						createdAt: groupWithForm['createdAt'] as Form['createdAt'],
						user: {
							id: groupWithForm['_userId'] as User['id'],
							name: groupWithForm['name'] as User['name'],
							school: groupWithForm['school'] as User['school'],
							admissionYear: groupWithForm['admissionYear'] as User['admissionYear'],
							birthdate: groupWithForm['birthdate'] as User['birthdate'],
							isMale: groupWithForm['isMale'] as User['isMale'],
							media: {
								id: groupWithForm['mediaId'] as Media['id'],
								hash: groupWithForm['hash'] as Media['hash'],
								type: groupWithForm['type'] as Media['type']
							}
						}
					};

          return transaction.selectFrom('form_answer')
            .select([
							'id',
							'content'
						])
            .where('form_answer.form_id', '=', request['params']['formId'])
            .orderBy('id', 'asc')
            .execute();
				})
        .then(function (answers: Pick<FormAnswer, 'id' | 'content'>[]): void {
          reply.send(Object.assign(form, {
						answers: answers
					}));
        });
		});
}