import S, { JSONSchema } from 'fluent-json-schema';
import commonSchema from './common';
import groupSchema from './group';
import { Banks } from '@library/constant';
import { Fee } from '@library/type';

export default {
	id: commonSchema['id'],
	name: S.string()
		.minLength(1)
		.maxLength(16),
	bank: S.integer()
		.enum([
			Banks['KDB산업은행'],
			Banks['IBK기업은행'],
			Banks['KB국민은행'],
			Banks['수협은행'],
			Banks['NH농협은행'],
			Banks['우리은행'],
			Banks['SC은행'],
			Banks['씨티은행'],
			Banks['대구은행'],
			Banks['부산은행'],
			Banks['광주은행'],
			Banks['제주은행'],
			Banks['전북은행'],
			Banks['경남은행'],
			Banks['MG새마을금고'],
			Banks['신협'],
			Banks['저축은행'],
			Banks['산림조합'],
			Banks['우체국'],
			Banks['하나은행'],
			Banks['신한은행'],
			Banks['케이뱅크'],
			Banks['카카오뱅크'],
			Banks['토스뱅크'],
			Banks['SBI저축은행']
		]),
	account: S.string()
		.pattern(/^[0-9]{7,14}$/),
	amount: S.integer()
		.minimum(1)
		.maximum(2147483648),
	groupId: groupSchema['id'],
	endAt: commonSchema['date']
} satisfies Record<keyof Omit<Fee, 'createdAt' | 'deletedAt'>, JSONSchema>;