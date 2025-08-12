import { FastifySchemaValidationError } from 'fastify/types/schema';

export default function schemaErrorFormatHandler(errors: FastifySchemaValidationError[], name: string): Error {
	return new Error(name + (errors[0]['instancePath']['length'] !== 0 ? '["' + errors[0]['instancePath'].slice(1) + '"] ' : ' ') + errors[0]['message']);
}