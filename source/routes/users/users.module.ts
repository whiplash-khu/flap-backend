import Module from '@library/module';
import postUsersController from './postUsers.controller';
import S from 'fluent-json-schema';
import userSchema from '@schemas/user';
import verificationSchema from '@schemas/verification';
import getUserController from './getUser.controller';
import patchUserController from './patchUser.controller';
import deleteUserController from './deleteUser.controller';
import userSettingModule from './setting/userSetting.module';

export default new Module('users', [
	{
		method: 'POST',
		url: '',
		handler: postUsersController,
		excludePreHandler: true,
		schema: {
			body: S.object()
				.prop('password', userSchema['password'].required())
				.prop('name', userSchema['name'].required())
				.prop('birthdate', userSchema['birthdate'].required())
				.prop('isMale', userSchema['isMale'].required())
				.prop('school', userSchema['school'].required())
				.prop('admissionYear', userSchema['admissionYear'].required())
				.prop('token', verificationSchema['token'].required())
		}
	}, {
		method: 'GET',
		url: ':userId',
		handler: getUserController,
		schema: {
			params: S.object()
				.prop('userId', userSchema['id'].required())
		}
	}, {
		method: 'PATCH',
		url: ':userId',
		handler: patchUserController,
		schema: {
			params: S.object()
				.prop('userId', userSchema['id'].required()),
			body: S.object()
				.prop('previousPassword', userSchema['password'])
				.prop('password', userSchema['password'])
				.prop('name', userSchema['name'])
				.prop('birthdate', userSchema['birthdate'])
				.prop('isMale', userSchema['isMale'])
				.prop('school', userSchema['school'])
				.prop('admissionYear', userSchema['admissionYear'])
				.prop('mediaId', userSchema['mediaId'])
				.anyOf([
					S.object()
						.required(['previousPassword', 'password']),
					S.object()
						.required(['name']),
					S.object()
						.required(['birthAt']),
					S.object()
						.required(['school']),
					S.object()
						.required(['mediaId'])
				])
		}
	}, {
		method: 'DELETE',
		url: ':userId',
		handler: deleteUserController,
		schema: {
			params: S.object()
				.prop('userId', userSchema['id'].required()),
		}
	}
], [userSettingModule]);