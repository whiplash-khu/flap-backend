import { Insertable, Kysely, OnConflictBuilder, OnConflictUpdateBuilder, PostgresDialect, sql } from 'kysely';
import { Database, Tag, TagTable } from './type';
import { Pool } from 'pg';
import { randomBytes } from 'crypto';
import { emptySelection } from './constant';
import { BadRequest } from './httpError';

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

export function selectEmptyMedia(kysely: Kysely<Database>, id: number): Promise<{} | undefined> {
	if(id === 0) {
		return Promise.resolve({});
	}

	return kysely.selectFrom('media')
		.select(emptySelection)
		.where('id', '=', id)
		.executeTakeFirst();
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
				.doUpdateSet('name');
		})
		.returning('id')
		.execute();
}

const emoji = {
	1: 'good',
	2: 'heart',
	3: 'check',
	4: 'star'
} as const;

export type emojiName = typeof emoji[keyof typeof emoji]; 

export function getEmojiName(emojiId?: number | null): emojiName | undefined {
	if (typeof emojiId !== 'number') return undefined;
	return (emojiId in emoji)
		? emoji[emojiId as keyof typeof emoji] 
		: undefined;
}
