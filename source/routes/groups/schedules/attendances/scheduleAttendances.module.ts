import Module from '@library/module';
import getScheduleAttendancesController from './getScheduleAttendances.controller';
import S from 'fluent-json-schema';
import scheduleSchema from '@schemas/schedule';
import pagenationSchema from '@schemas/pagenation';
import patchScheduleAttendanceController from './patchScheduleAttendance.controller';
import scheduleAttendanceSchema from '@schemas/scheduleAttendance';

export default new Module(':scheduleId/attendances', [
	{
		method: 'GET',
		url: '',
		handler: getScheduleAttendancesController,
		schema: {
			params: S.object()
				.prop('groupId', scheduleSchema['groupId'].required())
				.prop('scheduleId', scheduleAttendanceSchema['scheduleId'].required()),
			querystring: S.object()
				.prop('index', pagenationSchema['index'])
				.prop('size', pagenationSchema['size'])
		}
	},
	{
		method: 'PATCH',
		url: ':attendanceId',
		handler: patchScheduleAttendanceController,
		schema: {
			params: S.object()
				.prop('groupId', scheduleSchema['groupId'].required())
				.prop('scheduleId', scheduleAttendanceSchema['scheduleId'].required())
				.prop('attendanceId', scheduleAttendanceSchema['id'].required()),
			body: S.object()
				.prop('status', scheduleAttendanceSchema['status'].required())
		}
	}
]);