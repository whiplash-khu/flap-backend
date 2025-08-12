import Module from '@library/module';
import getRootController from './getRoot.controller';
import postAndGetCoffeeController from './postAndGetCoffee.controller';
import getRobotsTxtController from './getRobotsTxt.controller';
import dotWellKnownModule from './dotWellKnown/dotWellKnown.module';

export default new Module('/', [{
	method: 'GET',
	url: '',
	handler: getRootController,
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
}], [dotWellKnownModule]);