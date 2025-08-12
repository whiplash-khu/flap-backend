import { Kysely, PostgresDialect, sql } from 'kysely';
import { Database } from './type';
import { Pool } from 'pg';
import { randomBytes } from 'crypto';

export const kysely: Kysely<Database> = new Kysely<Database>({
	dialect: new PostgresDialect({
		pool: new Pool({
			connectionString: process['env']['DATABASE_URL']
		})
	})
});

export function createUniqueToken(kysely: Kysely<Database>, table: 'user_lost_password' | 'verification'): Promise<string> {
	const token: string = randomBytes(32).toString('hex');

	return kysely.selectFrom(table)
		.select(sql.lit(1).as('v'))
		.where('token', '=', token)
		.executeTakeFirst()
		.then(function (row?: {}): Promise<string> | string {
			if(row === undefined) {
				return token;
			}

			return createUniqueToken(kysely, table);
		});
}