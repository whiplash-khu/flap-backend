import { getOperator, kysely } from '@library/database';
import { Database, Pagenation, Post } from '@library/type';
import { FastifyReply, FastifyRequest } from 'fastify';
import { SelectQueryBuilder } from 'kysely';

export default function (request: FastifyRequest<{
	Querystring: Pagenation;
}>, reply: FastifyReply): Promise<void> {
	return kysely.selectFrom('post')
		.select(['id', 'title', 'content', 'created_at as createdAt'])
		.where('group_id', '=', -1)
		.$if(typeof request['query']['index'] === 'number', function (queryBulder: SelectQueryBuilder<Database, 'post', Pick<Post, 'id' | 'title' | 'content' | 'createdAt'>>): typeof queryBulder {
			return queryBulder.where('post.id', getOperator(request['query']), request['query']['index'] as number);
		})
		.orderBy('post.id', 'desc')
		.limit(request['query']['size'])
		.execute()
		.then(function (posts: Pick<Post, 'id' | 'title' | 'content' | 'createdAt'>[]): void {
			reply.send(posts);
		});
}