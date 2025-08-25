import { kysely } from '@library/database';
import { NotFound } from '@library/httpError';
import { Database, Media, User } from '@library/type';
import { FastifyReply, FastifyRequest } from 'fastify';
import { SelectQueryBuilder } from 'kysely';

export default function (request: FastifyRequest<{
	Params: {
		userId: User['id'];
	};
}>, reply: FastifyReply): Promise<void> {
	return kysely.selectFrom('user')
		.select(['user.media_id as mediaId', 'user.name', 'user.school'])
		.$if(request['userId'] === request['params']['userId'], function (queryBuilder: SelectQueryBuilder<Database, 'user', Pick<User, 'name' | 'school' | 'mediaId'>>): typeof queryBuilder {
			return queryBuilder.select(['user.email', 'user.birth_at as birthAt']);
		})
		.innerJoin('media', 'user.media_id', 'media.id')
		.select(['media.hash', 'media.type'])
		.where('user.id', '=', request['params']['userId'])
		.where('user.deleted_at', 'is', null)
		.executeTakeFirst()
		// lazy
		.then(function (userWithMedia?: Pick<User & Media, 'name' | 'school' | 'mediaId' | 'hash' | 'type'> & Partial<Pick<User, 'email' | 'birthAt'>>): void {
			if(userWithMedia === undefined) {
				throw new NotFound('Params["userId"] must be valid');
			}

			reply.send({
				id: request['params']['userId'],
				email: userWithMedia['email'],
				name: userWithMedia['name'],
				birthAt: userWithMedia['birthAt'],
				school: userWithMedia['school'],
				media: {
					id: userWithMedia['mediaId'],
					hash: userWithMedia['hash'],
					type: userWithMedia['type']
				}
			});
		});
}
