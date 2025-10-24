import { encryptPbkdf2 } from '@library/crypto';
import { kysely } from '@library/database';
import { BadRequest } from '@library/httpError';
import { Database, User, Verification } from '@library/type';
import { getPreciseEpoch, getTimestamp } from '@library/time';
import { FastifyReply, FastifyRequest } from 'fastify';
import { InsertResult, Transaction } from 'kysely';

export default function (request: FastifyRequest<{
	Body: Pick<User & Verification, 'password' | 'name' | 'birthdate' | 'isMale' | 'school' | 'admissionYear' | 'token'>;
}>, reply: FastifyReply): Promise<void> {
	return kysely.transaction()
		.setAccessMode('read write')
		.setIsolationLevel('serializable')
		.execute(function (transaction: Transaction<Database>): Promise<void> {
			// lazy
			const user: Pick<User, 'id' | 'email'> = {} as Pick<User, 'id' | 'email'>;

			return transaction.deleteFrom('verification')
				.where('token', '=', request['body']['token'])
				.where('verification.created_at', '>', getTimestamp(getPreciseEpoch() - 43200))
				.returning('email')
				.executeTakeFirst()
				.then(function (verification?: Pick<Verification, 'email'>): Promise<string> {
					if(verification === undefined) {
						throw new BadRequest('Body["token"] must be valid');
					}

					if(request['body']['admissionYear'] > (new Date()).getUTCFullYear()) {
						throw new BadRequest('Body["admissionYear"] must not be later than now');
					}

					user['email'] = verification['email'];

					return encryptPbkdf2(request['body']['password'], user['email']);
				})
				.then(function (encryptedPassword: string): Promise<Pick<User, 'id'>> {
					return transaction.insertInto('user')
						.values({
							email: user['email'],
							password: encryptedPassword,
							name: request['body']['name'],
							birthdate: request['body']['birthdate'],
							is_male: request['body']['isMale'],
							school: request['body']['school'],
							admission_year: request['body']['admissionYear'],
							media_id: 0
						})
						.returning('id')
						.executeTakeFirstOrThrow();
				})
				.then(function (_user: Pick<User, 'id'>): Promise<InsertResult> {
					user['id'] = _user['id'];

					return transaction.insertInto('user_setting')
						.values({
							user_id: user['id']
						})
						.executeTakeFirstOrThrow();
				})
				.then(function (): void {
					reply.status(201)
						.header('location', '/users/' + user['id'])
						.send({
							id: user['id']
						});
				});
		});
}