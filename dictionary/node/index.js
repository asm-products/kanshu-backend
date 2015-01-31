/**
 * Created by dsandor on 1/30/15.
 */
var restify           = require('restify'),
    dictionaryService = require('./dictionary.service.js'),
    bunyan            = require('bunyan'),
    nconf              = require('nconf');

var log = bunyan.createLogger({name: 'api', level: 'debug'});

nconf.argv()
    .env()
    .file({ file: 'config.json' });

dictionaryService.setLogger(log);

var server = restify.createServer();

server.use(restify.authorizationParser());
server.use(restify.bodyParser({ mapParams : true }));

server.get('/lookup/:phrase', dictionaryService.lookup);

/**
 This code will start the http server.
 */
server.listen(nconf.get("apiServicePort"), function() {
    log.info('%s listening at %s', server.name, server.url);
});