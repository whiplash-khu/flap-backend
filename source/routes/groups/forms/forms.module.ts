import Module from '@library/module';
import S from 'fluent-json-schema';
import postFormsController from './postForms.controller';
import getFormsController from './getForms.controller';
import getFormController from './getForm.controller';
import formSchema from '@schemas/form';
import formAnswerSchema from '@schemas/formAnswer';
import pagenationSchema from '@schemas/pagenation';

export default new Module(':groupId/forms', [
  {
    method: 'POST',
    url: '',
    handler: postFormsController,
    schema: {
      params: S.object()
        .prop('groupId', formSchema['groupId'].required()),
      body: S.object()
        .prop('answers', S.array()
          .items(formAnswerSchema['content'])
          .minItems(1)
          .required())
    }
  },
  {
    method: 'GET',
    url: '',
    handler: getFormsController,
    schema: {
      querystring: S.object()
        .prop('index', pagenationSchema['index'])
        .prop('size', pagenationSchema['size']),
      params: S.object()
        .prop('groupId', formSchema['groupId'].required())
    }
  },
  {
    method: 'GET',
    url: ':formId',
    handler: getFormController,
    schema: {
      params: S.object()
        .prop('groupId', formSchema['groupId'].required())
        .prop('formId', formSchema['id'].required())
    }
  },
]);