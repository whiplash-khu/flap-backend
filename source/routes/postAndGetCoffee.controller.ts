import { ImATeapot } from '@library/httpError'
import { FastifyRequest, FastifyReply } from 'fastify'

export default function (request: FastifyRequest, reply: FastifyReply): void {
  throw new ImATeapot("I'm sorry, but this server is powered by Teapot™");
}