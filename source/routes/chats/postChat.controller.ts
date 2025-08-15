import { kysely } from "@library/database";
import { BadRequest } from "@library/httpError";
import { Chat, Database, User } from "@library/type";
import { FastifyRequest, FastifyReply } from "fastify";
import { Transaction } from "kysely";

export default function (request: FastifyRequest<{
    Body: {
        name: Chat['name'];
        participantIds: User['id'][];
    };
}>, reply: FastifyReply): Promise<void> {
    const user = (request as any)['userId']; 
    if (!Number.isInteger(user)) {
        throw new BadRequest('Unauthorized'); 
    }

    const Ids = Array.isArray(request.body?.participantIds) ? request.body.participantIds : [];

    const participant: number[] = Array
        .from(new Set<number>([...Ids, user]))
        .filter((v): v is number => Number.isInteger(v));
    // const userId = request['userId'];
    // const participant: number[] = Array.from(new Set([...(request['body']['participantIds'] ?? []), userId]));

    return kysely.transaction()
        .setAccessMode('read write')
        .setIsolationLevel('serializable')
        .execute(function (transaction: Transaction<Database>): Promise<void> {
            return transaction.selectFrom('user')
                .select(({ fn }) => [fn.countAll().as('cnt')])
                .where('id', 'in', participant as number[])
                .where('deleted_at', 'is', null)
                .executeTakeFirst()
                .then(function (userVerify) {
                    if (Number(userVerify?.cnt ?? 0) !== 2) {
                        throw new BadRequest('["participantIds"] must contain exactly two valid users');
                    }

                    return transaction.insertInto('chat')
                        .values({ 
                            name: request['body']['name'] 
                        })
                        .returning(['id', 'name'])
                        .executeTakeFirstOrThrow();
                })
            .then(function (chat): Promise<void> {
                return transaction.insertInto('chat_user')
                    .values(participant.map((uid) => ({ 
                        chat_id: chat['id'], 
                        user_id: uid 
                    })))
                    .execute()
                    .then(function (): void {
                    reply.send({ 
                        id: chat['id'], 
                        name: chat['name'] 
                    })});
            });
        });
}
