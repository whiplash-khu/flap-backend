import Module from '@library/module';
import getRootController from './getRoot.controller';
import postAndGetCoffeeController from './postAndGetCoffee.controller';
import getRobotsTxtController from './getRobotsTxt.controller';
import dotWellKnownModule from './dotWellKnown/dotWellKnown.module';
import authModule from './auth/auth.module';
import usersModule from './users/users.module';
import chatsModule from './chats/chats.module';
import groupsModule from './groups/groups.module';
import mediasModule from './medias/medias.module';
import webSocketHandler from '@handlers/websocket';
import noticesModule from './notices/notices.module';

export default new Module('/', [
	{
		method: 'GET',
		url: '',
		handler: getRootController,
		// @ts-expect-error
		wsHandler: webSocketHandler,
		excludePreHandler: true
	},
	{
		method: 'POST',
		url: 'coffee',
		handler: postAndGetCoffeeController,
		excludePreHandler: true
	},
	{
		method: 'GET',
		url: 'coffee',
		handler: postAndGetCoffeeController,
		excludePreHandler: true
	}, {
		method: 'GET',
		url: 'robots.txt',
		handler: getRobotsTxtController,
		excludePreHandler: true
	}
], [authModule, dotWellKnownModule, chatsModule, groupsModule, usersModule, noticesModule, mediasModule]);