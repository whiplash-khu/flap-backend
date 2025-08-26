import { Insertable, Kysely, OnConflictBuilder, OnConflictUpdateBuilder, PostgresDialect, sql } from 'kysely';
import { Database, Tag, TagTable } from './type';
import { Pool, types } from 'pg';
import { randomBytes } from 'crypto';
import { S3Client } from '@aws-sdk/client-s3';

types.setTypeParser(types['builtins']['INT8'], Number.parseInt);

export const kysely: Kysely<Database> = new Kysely<Database>({
	dialect: new PostgresDialect({
		pool: new Pool({
			connectionString: process['env']['DATABASE_URL']
		})
	})
});

export const s3: S3Client = new S3Client({
	region: process['env']['STORAGE_REGION'],
	credentials: {
		accessKeyId: process['env']['STORAGE_ACCESS_KEY'],
		secretAccessKey: process['env']['STORAGE_SECRET_KEY'],
	},
	// TODO: Remove on production
	forcePathStyle: true,
	endpoint: 'https://' + process['env']['STORAGE_ENDPOINT']
});

export function createUniqueToken(kysely: Kysely<Database>, table: 'user_lost_password' | 'verification'): Promise<string> {
	const token: string = randomBytes(32).toString('hex');

	return kysely.selectFrom(table)
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

export function createTags(kysely: Kysely<Database>, names: Tag['name'][]): Promise<Pick<Tag, 'id'>[]> {
	const tagInserts: Insertable<TagTable>[] = [];

	for(let i: number = 0; i < names['length']; i++) {
		tagInserts.push({
			name: names[i]
		});
	}

	return kysely.insertInto('tag')
		.values(tagInserts)
		.onConflict(function (builder: OnConflictBuilder<Database, 'tag'>): OnConflictUpdateBuilder<Database, 'tag'> {
			return builder.column('name')
				// to retreive id
				.doUpdateSet({
					name: sql`excluded.name`
				});
		})
		.returning('id')
		.execute();
}