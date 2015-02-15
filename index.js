/**
 * Created by dsandor on 2/15/15.
 */
var restify           = require('restify'),
    dictionaryService = require('./dictionary.pg.service.js'),
    userService       = require('./user.service.js'),
    bunyan            = require('bunyan'),
    nconf             = require('nconf');

var log = bunyan.createLogger({name: 'api', level: 'debug'});

nconf.argv()
    .env()
    .file({ file: 'config.json' });

dictionaryService.setLogger(log);
dictionaryService.setConnectionString(nconf.get('connectionString'));

var server = restify.createServer();
/**
 * These are the http interceptors.
 */
server.use(restify.authorizationParser());
server.use(userService.authenticate);
server.use(restify.bodyParser({ mapParams : true }));

/**
 * Dictionary service url routes.
 * These are the Dictionary API routes.  They map to the functions defined in the dictionary.pg.service file.
 */
server.get('/lookup/:phrase', dictionaryService.lookup);
server.post('/processFeed', dictionaryService.processFeed);

/**
 * Authentication service url routes.
 * These are the Auth API routes.  They map to the functions defined in the user.service.js file.
 */
server.get('/login', userService.login);
server.post('/createUser', userService.createUser);
server.post('/updateUser', userService.updateUser);
server.get('/logout', userService.logout);
server.get('/validate', userService.validate);

/**
 This code will start the http server.
 */
var port = process.env.PORT || nconf.get('apiServicePort');
server.listen(port, function() {
    log.info('%s listening at %s', server.name, server.url);

    dictionaryService.precacheDictionary();
});