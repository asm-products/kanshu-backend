/**
 * Created by dsandor on 3/3/15.
 */
var nconf = require('nconf'),
    pg    = require('pg');

nconf.argv()
    .env()
    .file({ file: '../config.json' });

var connectionString = nconf.get('DATABASE_URL');
var scanFeedsForNewArticlesIntervalSeconds = nconf.get('scanFeedsForNewArticlesIntervalSeconds') * 1000;


setTimeout(scanFeedsForNewArticles, scanFeedsForNewArticlesIntervalSeconds);

function scanFeedsForNewArticles() {

    getArticleSources(function(sources) {
       if (!sources) {
           console.log('an error must have occurred while getting sources.');
       } else {
           console.log('Got the following sources: ');
           for(var i=0; i < sources.length; i++) {
               console.log('topic: %s, rssfeedurl: %s', sources[i].topic, sources[i].rssFeedUrl);
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