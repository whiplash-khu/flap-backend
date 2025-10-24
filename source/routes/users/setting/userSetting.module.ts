import Module from '@library/module';
import getUserSettingController from './getUserSetting.controller';
import S from 'fluent-json-schema';
import userSchema from '@schemas/user';
import patchUserSettingController from './patchUserSetting.controller';

export default new Module(':userId/setting', [
	{
			method: 'GET',
			url: '',
			handler: getUserSettingController,
			schema: {
				params: S.object()
					.prop('userId', userSchema['id'].required())
			}
	},
	{
		method: 'PATCH',
		url: '',
		handler: patchUserSettingController,
		schema: {
			params: S.object()
				.prop('userId', userSchema['id'].required()),
			body: S.object()
				.prop('isGroupNoticeEnabled', S.boolean())
				.prop('isPostEnabled', S.boolean())
				.prop('isScheduleEnabled', S.boolean())
				.prop('isFeeEnabled', S.boolean())
				.anyOf([
					S.object()
						.required(['isGroupNoticeEnabled']),
					S.object()
						.required(['isPostEnabled']),
					S.object()
						.required(['isScheduleEnabled']),
					S.object()
						.required(['isFeeEnabled'])
				])
		}
	}
])