import { VERIFICATION_TEMPLATE } from '@library/constant';
import { kysely, createUniqueToken } from '@library/database';
import { BadRequest } from '@library/httpError';
import { sendMail } from '@library/mailer';
import { Database, Verification } from '@library/type';
import { FastifyReply, FastifyRequest } from 'fastify';
import { InsertResult, OnConflictBuilder, OnConflictUpdateBuilder, sql, Transaction } from 'kysely';

export default function (request: FastifyRequest<{
	Body: Pick<Verification, 'email'>;
}>, reply: FastifyReply): Promise<void> {
	return kysely.transaction()
		.setAccessMode('read write')
		.setIsolationLevel('serializable')
		.execute(function (transaction: Transaction<Database>): Promise<void> {
			let token: string;

			return kysely.selectFrom('user')
				.select(sql.lit(1).as('v'))
				.where('email', '=', request['body']['email'])
				.executeTakeFirst()
				.then(function (row?: {}): Promise<string> {
					if(row !== undefined) {
						throw new BadRequest('Body["email"] must be unique');
					}

					return createUniqueToken(kysely, 'verification');
				})
				.then(function (_token: string): Promise<InsertResult> {
					token = _token;

					return transaction.insertInto('verification')
					.values({
						email: request['body']['email'],
						token: _token
					})
					// resend mail
					.onConflict(function (builder: OnConflictBuilder<Database, 'verification'>): OnConflictUpdateBuilder<Database, 'verification'> {
						return builder.column('email')
							.doUpdateSet({
								token: _token
							});
					})
					.executeTakeFirstOrThrow();
				})
				.then(function (): Promise<boolean> {
					return sendMail(request['body']['email'], '[Flap] 회원가입 메일 인증', VERIFICATION_TEMPLATE.replace(/{token}/g, token));
				})
				.then(function (): void {
					reply.status(204)
					.send();
				});
		});
}