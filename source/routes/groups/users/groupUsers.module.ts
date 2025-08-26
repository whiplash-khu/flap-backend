import Module from '@library/module';
import postGroupUsersController from './postGroupUsers.controller';
import getGroupUsersController from './getGroupUsers.controller';
import S from 'fluent-json-schema';
import groupUserSchema from '@schemas/groupUser';
import pagenationSchema from '@schemas/pagenation';
import deleteGroupUserController from './deleteGroupUser.controller';
import groupUserAttendanceModule from './attendance/groupUserAttendance.module';

export default new Module(':groupId/users', [
	{
		method: 'POST',
		url: '',
		handler: postGroupUsersController,
		schema: {
			params: S.object()
				.prop('groupId', groupUserSchema['groupId'].required()),
			body: S.object()
				.prop('userId', groupUserSchema['userId'].required())
		}
	},
	{
		method: 'GET',
		url: '',
		handler: getGroupUsersController,
		schema: {
			params: S.object()
				.prop('groupId', groupUserSchema['groupId'].required()),
			querystring: S.object()
				.prop('index', pagenationSchema['index'])
				.prop('size', pagenationSchema['size'])
		}
	},
	{
		method: 'DELETE',
		url: ':userId',
		handler: deleteGroupUserController,
		schema: {
			params: S.object()
				.prop('groupId', groupUserSchema['groupId'].required())
				.prop('userId', groupUserSchema['userId'].required())
		}
	}
], [groupUserAttendanceModule]);