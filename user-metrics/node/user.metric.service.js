/**
 * Created by dsandor on 3/1/15.
 */
var feed        = require('feed-read'),
    data        = require('./data.pg.js'),
    async       = require('async'),
    NodeCache   = require('node-cache');

var log = {};

module.exports = {
    saveWord: internalSaveWord,

    deleteWord: internalDeleteWord,

    linkArticle: internalLinkArticle,

    getWordsByUser: internalGetWordsByUser,

    markWordMastered: internalMarkWordMastered,

    getWordsMasteredMetric: internalGetWordsMasteredMetric,

    getMasteredByLevel: internalGetMasteredByLevel,

    /**
     * Sets the logger to use.
     * @param value
     */
    setLogger: function(value)
    {
        console.log('setting logger (dictionary.pg.service.js)');
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

// TODO: create the service methods (internal) for these that pass back to the data layer.
function internalSaveWord(req, res, next) {
 // data.saveWord()
}