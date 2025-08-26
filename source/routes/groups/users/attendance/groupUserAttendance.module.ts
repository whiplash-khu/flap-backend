import Module from '@library/module';
import getGroupUserAttendanceController from './getGroupUserAttendance.controller';
import S from 'fluent-json-schema';
import groupUserSchema from '@schemas/groupUser';

export default new Module(':userId/attendance', [
	{
		method: 'GET',
		url: '',
		handler: getGroupUserAttendanceController,
		schema: {
			params: S.object()
				.prop('groupId', groupUserSchema['groupId'].required())
				.prop('userId', groupUserSchema['userId'].required())
		}
	}
]);