/**
 * This module is used to consolidate the data calls in one place so the backend
 * persistence store can be switched out with minimal effort.
 *
 * Created by dsandor on 1/28/15.
 */
var pg = require('pg');

module.exports = {

    getEntireDictionary: internalGetEntireDictionary,

    setLogger: function(value) { log = value; },

    setConnectionString: function(value) { connectionString = value; },

    getArticleById: internalGetArticleById,

    getArticleListBySourceId: internalGetArticleListBySourceId

};

var log = {},
    connectionString = '';
/**
 * Gets the entire dictionary by translatedTo (e.g. en for english, es for spanish, fr for french)
 * @param err - a callback that is called if there is an error.
 * @param translatedTo - (e.g. en for english, es for spanish, fr for french)
 * @param complete - the callback that is called when the process completes.  Takes a parameter which will be the list of dictionary entries.
 */
function internalGetEntireDictionary(err, translatedTo, complete) {
    log.debug('GetEntireDictionary called for translatedTo: %s', translatedTo);

    pg.connect(connectionString, function(pgcerr, client, done) {

        if (pgcerr) {
            if (typeof err != 'undefined') err(pgcerr);

            done(client);
            return err
        }

        var query = client.query('SELECT * FROM words WHERE translatedto=$1 ORDER BY traditional', [translatedTo]);

        query.on('row', function(row, result) {
            result.addRow(row);
        });

        query.on('error', function(pgerr) {
            done(client);
            return err(pgerr);
        });

        query.on('end', function(result) {
            log.debug('%s rows found', result.rowCount);
            done();
            var words = [];

            for(var i=0; i < result.rowCount; i++) {
                words.push({
                    translatedto:  result.rows[i].translatedto,
                    traditional:   result.rows[i].traditional,
                    simplified:    result.rows[i].simplified,
                    pronunciation: result.rows[i].pronunciation,
                    hsklevel:      result.rows[i].hsklevel,
                    definitions:    [ result.rows[i].definition ]
                });
            }

                // TODO: Get all the definitions.. use underscore to find an existing item in the array and
                // add the new definition to it.

            return complete(words);
        });

    });

}

/**
 * This function will return an article by its id.
 * @param articleId - the ID of the object to return.
 * @param complete - complete(err, article) passes err if there was an error otherwise it returns an article object.
 */
function internalGetArticleById(articleId, complete) {
    log.debug('internalGetArticleById called for articleId: %s', articleId);

    pg.connect(connectionString, function(pgcerr, client, done) {

        if (pgcerr) {
            done(client);
            return complete(pgcerr);
        }

        var query = client.query('SELECT * FROM article WHERE articleid = $1 order by id DESC;', [articleId]);

        query.on('row', function(row, result) {
            result.addRow(row);
        });

        query.on('error', function(pgerr) {
            done(client);
            return complete(pgerr);
        });

        query.on('end', function(result) {
            log.debug('%s rows found', result.rowCount);
            done();
            var article = { };

            if (result.rows.length > 0) { // There should be only one.
                article.id = result.rows[0].id;
                article.url = result.rows[0].url;
                article.articlesourceid = result.rows[0].articlesourceid;

                if (typeof result.rows[0].title != 'undefined') {
                    article.title = JSON.parse(result.rows[0].title);
                }

                if (typeof result.rows[0].content != 'undefined') {
                    article.content = JSON.parse(result.rows[0].content);
                }
            }

            return complete(undefined, article);
        });
    });
}

/**
 * This function will return an article by its id.
 * @param sourceId - the ID of the articleSource.
 * @param maxRows - the maximum number of articles to return, 0 = return all.
 * @param complete - complete(err, article) passes err if there was an error otherwise it returns an array of article objects.
 */
function internalGetArticleListBySourceId(sourceId, maxRows, complete) {
    log.debug('internalGetArticleListBySourceId called for sourceId: %s and maxRows: %s', sourceId, maxRows);

    pg.connect(connectionString, function(pgcerr, client, done) {

        if (pgcerr) {
            done(client);
            return complete(pgcerr);
        }

        var query = client.query('SELECT * FROM article WHERE articlesourceid = $1 order by id DESC;', [sourceId]);

        query.on('row', function(row, result) {
            result.addRow(row);
        });

        query.on('error', function(pgerr) {
            done(client);
            return complete(pgerr);
        });

        query.on('end', function(result) {
            log.debug('%s rows found', result.rowCount);
            done();
            var articles = [];
            var rowsToReturn = result.rows.length;

            if (maxRows > 0 && maxRows < result.rows.length) rowsToReturn = maxRows;

            for(var i=0; i < maxRows; i++) {
                var article = {};

                article.id = result.rows[0].id;
                article.url = result.rows[0].url;
                article.articlesourceid = result.rows[0].articlesourceid;

                if (typeof result.rows[0].title != 'undefined') {
                    article.title = JSON.parse(result.rows[0].title);
                }

                if (typeof result.rows[0].content != 'undefined') {
                    article.content = JSON.parse(result.rows[0].content);
                }

                articles.push(article);
            }

            return complete(undefined, articles);
        });
    });
}

