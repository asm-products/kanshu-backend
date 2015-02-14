/**
 * Created by dsandor on 1/30/15.
 */
var restify           = require('restify'),
    dictionaryService = require('./dictionary.pg.service.js'),
    bunyan            = require('bunyan'),
    nconf              = require('nconf');

var log = bunyan.createLogger({name: 'api', level: 'debug'});

nconf.argv()
    .env()
    .file({ file: 'config.json' });

dictionaryService.setLogger(log);
dictionaryService.setConnectionString(nconf.get('connectionString'));

var server = restify.createServer();

server.use(restify.authorizationParser());
server.use(restify.bodyParser({ mapParams : true }));

server.get('/lookup/:phrase', dictionaryService.lookup);
server.post('/processFeed', dictionaryService.processFeed);

/**
 This code will start the http server.
 */
var port = process.env.PORT || nconf.get('apiServicePort');
server.listen(port, function() {
    log.info('%s listening at %s', server.name, server.url);

    dictionaryService.precacheDictionary();
});