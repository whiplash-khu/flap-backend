import { FormAnswer } from '@library/type';
import S, { JSONSchema} from 'fluent-json-schema';
import commonSchema from './common';
import formSchema from './form';

export default {
  id: commonSchema['id'],
  formId: formSchema['id'],
  content: S.string()
    .minLength(1)
    .maxLength(160)
} satisfies Record<keyof FormAnswer, JSONSchema>;