/**
 * Created by dsandor on 2/15/15.
 */
var restify           = require('restify'),
    dictionaryService = require('./dictionary/node/dictionary.pg.service.js'),
    userService       = require('./authentication/node/user.service.js'),
    metricsService    = require('./user-metrics/node/user.metric.service.js'),
    bunyan            = require('bunyan'),
    nconf             = require('nconf'),
    spawn             = require('child_process').spawn;

var log = bunyan.createLogger({name: 'api', level: 'debug'});

nconf.argv()
    .env()
    .file({ file: 'config.json' });

dictionaryService.setLogger(log);
dictionaryService.setConnectionString(nconf.get('DATABASE_URL'));

userService.setLogger(log);
userService.setConnectionString(nconf.get('DATABASE_URL'));
userService.setInitialSessionExpirationMinutes(nconf.get('initialSessionExpirationMinutes'));

metricsService.setLogger(log);
metricsService.setConnectionString(nconf.get('DATABASE_URL'));

/**
 * Fire up the worker process.
 */
//worker = spawn('node', ['worker/index.js'], { stdio: 'inherit' });
//log.debug('started worker PID: %s', worker.pid);


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
server.get('/article/:articleId', dictionaryService.getArticleById);
server.get('/articles/:sourceId/:maxRows', dictionaryService.getArticleListBySourceid);
server.get('/articles/:sourceId', dictionaryService.getArticleListBySourceid);
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
 * User metrics service url routes.
 */
server.post('/saveword', metricsService.saveWord);
server.post('/deleteword', metricsService.deleteWord);
server.post('/linkarticle', metricsService.linkArticle);
server.post('/markmastered', metricsService.markWordMastered);
server.get('/getwords', metricsService.getWordsByUser);
server.get('/getwordsmastered', metricsService.getWordsMasteredMetric);
server.get('/getmasteredbylevel', metricsService.getMasteredByLevel);

/**
 This code will start the http server.
 */
var port = process.env.PORT || nconf.get('apiServicePort');
server.listen(port, function() {
    log.info('%s listening at %s', server.name, server.url);

    dictionaryService.precacheDictionary();
});