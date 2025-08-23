import Module from '@library/module';
import S from 'fluent-json-schema';
import getGroupQuestionsController from './getGroupQuestions.controller'
import groupQuestionSchema from '@schemas/groupQuestion';

export default new Module(':groupId/questions', [
  {
    method: 'GET',
    url: '',
    handler: getGroupQuestionsController,
    schema: {
      params: S.object()
        .prop('groupId', groupQuestionSchema['groupId'].required()),
    }
  }
]);