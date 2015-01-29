/**
    This is the entry point for the service.  The code in this file
    will start up the REST api and bind the method implementations to
    the api routes.
 */

var restify     = require('restify'),
    userService = require('./user.service.js'),
    bunyan      = require('bunyan'),
    nconf       = require('nconf');

var log = bunyan.createLogger({name: 'api', level: 'debug'});

nconf.argv()
    .env()
    .file({ file: 'config.json' });

userService.setLogger(log);
userService.setConnectionString(nconf.get('connectionString'));
userService.setInitialSessionExpirationMinutes(nconf.get('initialSessionExpirationMinutes'));

var server = restify.createServer();

/**
 * These are the http interceptors.
 */
server.use(restify.authorizationParser());
server.use(userService.authenticate);
server.use(restify.bodyParser({ mapParams : false }));

/**
 These are the API routes.  They map to the functions defined in the user.service.js file.
 */
server.get('/login', userService.login);
server.post('/createUser', userService.createUser);
server.post('/updateUser', userService.updateUser);
server.get('/logout', userService.logout);

/**
    This code will start the http server.
 */
server.listen(nconf.get("apiServicePort"), function() {
    log.info('%s listening at %s', server.name, server.url);
});