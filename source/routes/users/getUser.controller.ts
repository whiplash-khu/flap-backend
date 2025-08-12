import { kysely } from '@library/database';
import { NotFound } from '@library/httpError';
import { Media, User } from '@library/type';
import { FastifyReply, FastifyRequest } from 'fastify';

export default function (request: FastifyRequest<{
	Params: {
		userId: User['id'];
	};
}>, reply: FastifyReply): Promise<void> {
	return kysely.selectFrom('user')
		.select(request['userId'] === request['params']['userId'] ? ['user.email', 'user.name', 'user.birth_at as birthAt', 'user.school'] : ['user.name', 'user.school'])
		.innerJoin('media', 'user.media_id', 'media.id')
		.select(['media.hash', 'media.type'])
		.where('user.id', '=', request['params']['userId'])
		.where('user.deleted_at', 'is', null)
		.executeTakeFirst()
		// lazy
		.then(function (userWithMedia?: Pick<User & Media, 'name' | 'school' | 'hash' | 'type'> & Partial<Pick<User, 'email' | 'birthAt'>>): void {
			if(userWithMedia === undefined) {
				throw new NotFound('Params["userId"] must be valid');
			}

			reply.send({
				email: userWithMedia['email'],
				name: userWithMedia['name'],
				birthAt: userWithMedia['birthAt'],
				school: userWithMedia['school'],
				media: {
					hash: userWithMedia['hash'],
					type: userWithMedia['type']
				}
			});
		});
}
