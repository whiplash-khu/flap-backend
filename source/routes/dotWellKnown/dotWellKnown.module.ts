import Module from '@library/module';
import getSecurityTxtController from './getSecurityTxt.controller';

export default new Module('.well-known', [
	{
		method: 'GET',
		url: 'security.txt',
		handler: getSecurityTxtController,
		excludePreHandler: true
	}
]);