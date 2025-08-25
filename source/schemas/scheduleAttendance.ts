import { ScheduleAttendance } from '@library/type';
import S, { JSONSchema } from 'fluent-json-schema';
import commonSchema from './common';
import scheduleSchema from './schedule';
import userSchema from './user';
import { ScheduleAttendanceStatus } from '@library/constant';

export default {
	id: commonSchema['id'],
	scheduleId: scheduleSchema['id'],
	userId: userSchema['id'],
	status: S.integer()
		.enum([
			ScheduleAttendanceStatus['ABSENT'],
			ScheduleAttendanceStatus['LATE'],
			ScheduleAttendanceStatus['ATTEND']
		])
} satisfies Record<keyof ScheduleAttendance, JSONSchema>