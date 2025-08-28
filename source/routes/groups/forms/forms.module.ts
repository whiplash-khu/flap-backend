import Module from '@library/module';
import S from 'fluent-json-schema';
import postGroupFormsController from './postGroupForms.controller'
import getGroupFormsController from './getGroupForms.controller'
import getGroupFormController from './getGroupForm.controller'
import formSchema from '@schemas/form';
import formAnswerSchema from '@schemas/formAnswer';
import pagenationSchema from '@schemas/pagenation';

export default new Module(':groupId/forms', [
  {
    method: 'POST',
    url: '',
    handler: postGroupFormsController,
    schema: {
      params: S.object()
        .prop('groupId', formSchema['groupId'].required()),
      body: S.object()
        .prop('content', S.array()
          .items(formAnswerSchema['content'])
          .minItems(1)
          .uniqueItems(true)
          .required())
    }
  },
  {
    method: 'GET',
    url: '',
    handler: getGroupFormsController,
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
    handler: getGroupFormController,
    schema: {
      params: S.object()
        .prop('groupId', formSchema['groupId'].required())
        .prop('formId', formSchema['id'].required())
    }
  },
]);