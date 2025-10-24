import Module from '@library/module';
import getSchedulesController from './getSchedules.controller';
import S from 'fluent-json-schema';
import scheduleSchema from '@schemas/schedule';
import postSchedulesController from './postSchedules.controller';
import getScheduleController from './getSchedule.controller';
import patchScheduleController from './patchSchedule.controller';
import deleteScheduleController from './deleteSchedule.controller';
import scheduleAttendancesModule from './attendances/scheduleAttendances.module';

export default new Module(':groupId/schedules', [
	{
		method: 'POST',
		url: '',
		handler: postSchedulesController,
		schema: {
			params: S.object()
				.prop('groupId', scheduleSchema['groupId'].required()),
			body: S.object()
				.prop('name', scheduleSchema['name'].required())
				.prop('startAt', scheduleSchema['startAt'].required())
				.prop('endAt', scheduleSchema['endAt'].required())
				.prop('address', scheduleSchema['address'].required())
				.prop('description', scheduleSchema['description'].required())
		}
	},
	{
		method: 'GET',
		url: '',
		handler: getSchedulesController,
		schema: {
			params: S.object()
				.prop('groupId', scheduleSchema['groupId'].required()),
			querystring: S.object()
				.prop('year', S.integer()
					.minimum(2025)
					.required())
				.prop('month', S.integer()
					.minimum(1)
					.maximum(12)
					.required())
		}
	},
	{
		method: 'GET',
		url: ':scheduleId',
		handler: getScheduleController,
		schema: {
			params: S.object()
				.prop('groupId', scheduleSchema['groupId'].required())
				.prop('scheduleId', scheduleSchema['id'].required())
		}
	},
	{
		method: 'PATCH',
		url: ':scheduleId',
		handler: patchScheduleController,
		schema: {
			params: S.object()
				.prop('groupId', scheduleSchema['groupId'].required())
				.prop('scheduleId', scheduleSchema['id'].required()),
			body: S.object()
				.prop('name', scheduleSchema['name'])
				.prop('startAt', scheduleSchema['startAt'])
				.prop('endAt', scheduleSchema['endAt'])
				.prop('address', scheduleSchema['address'])
				.prop('description', scheduleSchema['description'])
				.anyOf([
					S.object()
						.required(['name']),
					S.object()
						.required(['startAt']),
					S.object()
						.required(['endAt']),
					S.object()
						.required(['address']),
					S.object()
						.required(['place']),
					S.object()
						.required(['description'])
				])
		}
	},
	{
		method: 'DELETE',
		url: ':scheduleId',
		handler: deleteScheduleController,
		schema: {
			params: S.object()
				.prop('groupId', scheduleSchema['groupId'].required())
				.prop('scheduleId', scheduleSchema['id'].required())
		}
	},
], [scheduleAttendancesModule]);