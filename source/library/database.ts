import { AliasedExpression, ComparisonOperatorExpression, Kysely, OperandValueExpressionOrList, PostgresDialect, ReferenceExpression, SelectQueryBuilder, sql, SqlBool } from 'kysely';
import { Database } from './type';
import { Pool } from 'pg';
import { randomBytes } from 'crypto';
import { emptySelection } from './constant';

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
		.select(emptySelection)
		.where('token', '=', token)
		.limit(1)
		.executeTakeFirst()
		.then(function (row?: {}): Promise<string> | string {
			if(row === undefined) {
				return token;
			}

			return createUniqueToken(kysely, table);
		});
}