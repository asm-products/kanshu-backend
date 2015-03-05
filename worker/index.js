/**
 * Created by dsandor on 3/3/15.
 */
var nconf          = require('nconf'),
    pg             = require('pg'),
    dictionaryData = require('../dictionary/node/data.pg.js');

nconf.argv()
    .env()
    .file({ file: __dirname + '/../config.json' });

var connectionString = nconf.get('DATABASE_URL');
var scanFeedsForNewArticlesIntervalSeconds = nconf.get('scanFeedsForNewArticlesIntervalSeconds') * 1000;

console.log('__dirname: %', __dirname);
console.log('connectionString: %s', connectionString);
console.log('scanFeedsForNewArticlesIntervalSeconds: %s', scanFeedsForNewArticlesIntervalSeconds);

setTimeout(scanFeedsForNewArticles, 5000);

function scanFeedsForNewArticles() {

    getArticleSources(function(sources) {
       if (!sources) {
           console.log('an error must have occurred while getting sources.');
       } else {
           console.log('Got the following sources: ');
           for(var i=0; i < sources.length; i++) {
               console.log('topic: %s, rssfeedurl: %s', sources[i].topic, sources[i].rssFeedUrl);
               // TODO: Figure out how to best enumerate the articleSources and articles in each source.
           }
       }

        setTimeout(scanFeedsForNewArticles, scanFeedsForNewArticlesIntervalSeconds);
    });
}

/**
 * Gets the article sources and calls the complete callback when complete with an array of articleSource objects:
 * { articleSourceId: Integer, topic: String, rssFeedUrl: String, isEnabled: Boolean }
 * @param complete - Called when process is complete with the articleSource array.
 */
function getArticleSources(complete) {

    var sql = 'SELECT * FROM articlesource WHERE isenabled = TRUE;';

    pg.connect(connectionString, function (pgcerr, client, done) {

        if (pgcerr) {
            console.log('Error connecting to pg server: %s', pgcerr.message);

            done(client);
            return complete();
        }
        var query = client.query(sql, []);

        query.on('row', function (row, result) {
            result.addRow(row);
        });

        query.on('error', function (pgerr) {
            done(client);
            console.log('error getting articleSources: %j', pgerr);
            return complete();
        });

        query.on('end', function (result) {
            console.log('%s rows found', result.rowCount);
            done();
            var articleSources = [];

            if (result.rowCount > 0) {
                for(var i=0; i < result.rowCount; i++) {
                    articleSources.push({
                        articleSourceId: result.rows[i].articlesourceid,
                        topic: result.rows[i].topic,
                        rssFeedUrl: result.rows[i].rssfeedurl,
                        isEnabled: result.rows[i].isenabled
                    });
                }

                console.log('got %s articleSources for processing.', articleSources.length);
                complete(articleSources);
            }

            console.log('got no articleSources..');
            return complete([]);
        });

    });
}

function saveArticle(article, articleSource, complete) {

    log.debug('Save article called');

    pg.connect(connectionString, function(pgcerr, client, done) {

        if (pgcerr) {
            if (typeof err != 'undefined') err(pgcerr);

            done(client);
            return complete(err);
        }

        var sql = 'INSERT INTO article (url, title, content, articlesourceid) VALUES ($1, $2, $3, $5);';

        client.query(sql, [article.url, article.title, article.content, articleSource.articleSourceId],
            function (pgqerr, result) {
                if (!pgqerr) {
                    done();
                    complete();
                } else {
                    done(client);
                    return err(pgqerr);
                }
            }
        );

        complete();
    });
}
