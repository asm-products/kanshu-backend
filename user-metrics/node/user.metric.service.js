/**
 * Created by dsandor on 3/1/15.
 */
var data        = require('./data.pg.js');

var log = {};

module.exports = {
    saveWord: internalSaveWord,

    deleteWord: internalDeleteWord,

    linkArticle: internalLinkArticle,

    getWordsByUser: internalGetWordsByUser,

    markWordMastered: internalMarkWordMastered,

    getWordsMasteredMetric: internalGetWordsMasteredMetric,

    getMasteredByLevel: internalGetMasteredByLevel,

    getArticlesReadMetric: internalGetArticlesReadMetric,
    /**
     * Sets the logger to use.
     * @param value
     */
    setLogger: function(value)
    {
        console.log('setting logger (user.metric.service.js)');
        log = value;
        data.setLogger(value);
    },

    /**
     * Sets the connection string for the data layer.
     * @param value
     */
    setConnectionString: function(value)
    {
        log.debug('connString: %s', value);
        data.setConnectionString(value);
    }

};

function internalSaveWord(req, res, next) {
    var sessionId = req.headers.sessionid;

    var saveComplete = function(err) {
        if (err) {
            res.send(500, err.message);
            return next();
        }

        res.send(200, { message: 'Word saved' });
        return next();
    };

    data.saveWord( req.body.wordId, sessionId, saveComplete );
}

function internalDeleteWord(req, res, next) {
    var sessionId = req.headers.sessionid;

    var deleteComplete = function(err) {
        if (err) {
            res.send(500, err.message);
            return next();
        }

        res.send(200, { message: 'Word deleted' });
        return next();
    };

    data.deleteWord( req.body.wordId, sessionId, deleteComplete );
}

function internalLinkArticle(req, res, next) {
    var sessionId = req.headers.sessionid;

    var linkComplete = function(err) {
        if (err) {
            res.send(500, err.message);
            return next();
        }

        res.send(200, { message: 'Article linked.' });
        return next();
    };

    data.linkArticle( req.body.articleId, sessionId, linkComplete );
}

function internalMarkWordMastered(req, res, next) {
    var sessionId = req.headers.sessionid;

    var markComplete = function(err) {
        if (err) {
            res.send(500, err.message);
            return next();
        }

        res.send(200, { message: 'Word marked mastered.' });
        return next();
    };

    data.markWordMastered( req.body.wordId, sessionId, markComplete );
}

function internalGetWordsByUser(req, res, next) {
    var sessionId = req.headers.sessionid;

    var getWordsComplete = function(words) {

        res.send(200, { words: words });
        return next();
    };

    var errorHandler = function(error) {
        res.send(500, {message: err.message});
        return next();
    };

    data.getWordsByUser( errorHandler, sessionId, 'en', getWordsComplete );
}

function internalGetWordsMasteredMetric(req, res, next) {
    var sessionId = req.headers.sessionid;

    var getMasteredMetricsComplete = function(result) {

        res.send(200, result);
        return next();
    };

    data.getWordsMasteredMetric( sessionId, getMasteredMetricsComplete );
}

function internalGetMasteredByLevel(req, res, next) {
    var sessionId = req.headers.sessionid;

    var getMasteredByLevelComplete = function(result) {

        res.send(200, result);
        return next();
    };

    data.getMasteredByLevel( sessionId, getMasteredByLevelComplete );
}

function internalGetArticlesReadMetric(req, res, next) {
    var sessionId = req.headers.sessionid;

    var getArticlesReadMetricComplete = function(result) {

        res.send(200, result);
        return next();
    };

    data.getArticlesReadMetric( sessionId, getArticlesReadMetricComplete );
}
