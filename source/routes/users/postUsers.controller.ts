import { encryptPbkdf2 } from '@library/crypto';
import { kysely } from '@library/database';
import { BadRequest } from '@library/httpError';
import { Database, User, Verification } from '@library/type';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Transaction } from 'kysely';

export default function (request: FastifyRequest<{
	Body: Pick<User & Verification, 'password' | 'name' | 'birthAt' | 'school' | 'token'>;
}>, reply: FastifyReply): Promise<void> {
	return kysely.transaction()
		.setAccessMode('read write')
		.setIsolationLevel('serializable')
		.execute(function (transaction: Transaction<Database>): Promise<void> {
			let email: string;

			return transaction.deleteFrom('verification')
				.where('token', '=', request['body']['token'])
				.returning('email')
				.executeTakeFirst()
				.then(function (verification?: Pick<Verification, 'email'>): Promise<string> {
					if(verification === undefined) {
						throw new BadRequest('Body["token"] must be valid');
					}

					email = verification['email'];

					return encryptPbkdf2(request['body']['password'], email);
				})
				.then(function (encryptedPassword: string): Promise<Pick<User, 'id'>> {
					return transaction.insertInto('user')
						.values({
							email: email,
							password: encryptedPassword,
							name: request['body']['name'],
							birth_at: request['body']['birthAt'],
							school: request['body']['school'],
							media_id: 0
						})
						.returning('id')
						.executeTakeFirstOrThrow();
				})
				.then(function (user: Pick<User, 'id'>): void {
					reply.status(201)
						.header('location', '/users/' + user['id'])
						.send(user);
				});
		});
}