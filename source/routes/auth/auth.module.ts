import Module from '@library/module';
import S from 'fluent-json-schema';
import userSchema from '@schemas/user';
import verificationSchema from '@schemas/verification';
import userLostPasswordSchema from '@schemas/userLostPassword';
import postLoginController from './postLogin.controller';
import postTokenController from './postToken.controller';
import postVerificationController from './postVerification.controller';
import postLostPasswordController from './postLostPassword.controller';
import patchLostPasswordController from './patchLostPassword.controller';
import commonSchema from '@schemas/common';

export default new Module('auth', [
	{
		method: 'POST',
		url: 'login',
		handler: postLoginController,
		excludePreHandler: true,
		schema: {
			body: S.object()
				.prop('email', userSchema['email'].required())
				.prop('password', userSchema['password'].required())
		}
	}, {
		method: 'POST',
		url: 'token',
		handler: postTokenController,
		excludePreHandler: true,
		schema: {
			body: S.object()
				.prop('refreshToken', commonSchema['jsonWebToken'].required())
		}
	}, {
		method: 'POST',
		url: 'verification',
		handler: postVerificationController,
		excludePreHandler: true,
		schema: {
			body: S.object()
				.prop('email', verificationSchema['email'].required())
		}
	}, {
		method: 'POST',
		url: 'lostPassword',
		handler: postLostPasswordController,
		excludePreHandler: true,
		schema: {
			body: S.object()
				.prop('email', userSchema['email'].required())
		}
	}, {
		method: 'PATCH',
		url: 'lostPassword',
		handler: patchLostPasswordController,
		excludePreHandler: true,
		schema: {
			body: S.object()
				.prop('token', userLostPasswordSchema['token'].required())
				.prop('password', userSchema['password'].required())
		}
	}
]);