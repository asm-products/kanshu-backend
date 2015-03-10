/**
 * Created by dsandor on 3/3/15.
 */
var nconf = require('nconf'),
    pg    = require('pg'),
    async = require('async'),
    feed  = require('feed-read'),
    dict  = require('../dictionary/node/dictionary.pg.service.js'),
    bunyan= require('bunyan'),
    fs    = require('fs'),
    uuid  = require('node-uuid');

var log = bunyan.createLogger({name: 'api', level: 'debug'});

nconf.argv()
    .env()
    .file({ file: __dirname + '/../config.json' });

var connectionString = nconf.get('DATABASE_URL');
var scanFeedsForNewArticlesIntervalSeconds = nconf.get('scanFeedsForNewArticlesIntervalSeconds') * 1000;

console.log('__dirname: %', __dirname);
console.log('connectionString: %s', connectionString);
console.log('scanFeedsForNewArticlesIntervalSeconds: %s', scanFeedsForNewArticlesIntervalSeconds);

dict.setLogger(log);
dict.setConnectionString(connectionString);

dict.precacheDictionary(function() {
    setTimeout(scanFeedsForNewArticles, 5000);
});

// async.each(openFiles, function(file, callback), function(err))

function scanFeedsForNewArticles() {

    getArticleSources(function(sources) {
       if (!sources) {
           console.log('an error must have occurred while getting sources.');
       } else {
           console.log('Got the following sources: ');

           async.eachSeries(sources, sourceIterator, sourceArrayComplete);
       }
    });
}

function sourceArrayComplete(err) {
    console.log('all topics processed.');
    //setTimeout(scanFeedsForNewArticles, scanFeedsForNewArticlesIntervalSeconds);
}

function sourceIterator(source, siComplete) {
    console.log('Processing topic: %s, rssfeedurl: %s', source.topic, source.rssFeedUrl);

    feed(source.rssFeedUrl, function(err, articles) {
        if (err) {
            console.log('feed error: %j', err);
            return siComplete();
        }
        // Each article has the following properties:
        //
        //   * "title"     - The article title (String).
        //   * "author"    - The author's name (String).
        //   * "link"      - The original article link (String).
        //   * "content"   - The HTML content of the article (String).
        //   * "published" - The date that the article was published (Date).
        //   * "feed"      - {name, source, link}
        //
        function feedItemArrayComplete(err) {
            if (err) {
                console.log('feedItemArrayComplete: %j', feedItemArrayComplete);
                return siComplete();
            }

            console.log('FEED_ITEM_ARRAY_COMPLETE');
            siComplete();
        }

        function feedItemIterator(feedItem, fiiComplete) {
            console.log('FEED ITEM: %s, %s, %s', feedItem.link, source.rssFeedUrl, feedItem.feed);

            if (feedItem.link == '') {
                console.log('feed item has no link.  Skipping.');
                return fiiComplete();
            }

            // TODO: Check to see if the feed item already exists.
            pg.connect(connectionString, function(pgcerr, client, done) {

                if (pgcerr) {
                    if (typeof err != 'undefined') err(pgcerr);

                    done(client);
                    return callback(err);
                }

                client.query('SELECT id FROM article WHERE url = $1 AND articlesourceid = $2;',
                    [feedItem.link, source.articleSourceId],
                    function (err, result) {
                        if (!err) {
                            if (result.rowCount == 1) {
                                console.log('Found article in db: %s', feedItem.link);
                                done();
                                return fiiComplete();
                            } else {
                                // article does not exist.. process it.
                                setTimeout(function() {
                                        dict.processArticle(feedItem, function(annotatedArticle) {

                                            if (typeof annotatedArticle === 'undefined' || typeof annotatedArticle['article'] === 'undefined') {
                                                console.log('Failed parsing article: %s, %s, %j', feedItem.link, source.rssFeedUrl, feedItem.feed);
                                                return fiiComplete();
                                            }

                                            console.log('ARTICLE PROCESSED: %s', annotatedArticle.article.length);

                                            if (annotatedArticle.article.length > 0) {

                                                pg.connect(connectionString, function(pgcerr, client, done) {

                                                    if (pgcerr) {
                                                        if (typeof err != 'undefined') err(pgcerr);

                                                        done(client);
                                                        return fiiComplete();
                                                    }

                                                    client.query('INSERT INTO article (url, title, content, articlesourceid) VALUES ($1, $2, $3, $4) RETURNING id;',
                                                        [annotatedArticle.link, JSON.stringify(annotatedArticle.title), JSON.stringify(annotatedArticle.article), source.articleSourceId],
                                                        function (pgqerr, result) {
                                                            if (!pgqerr) {
                                                                console.log('Saved article id [%s]: %s', result.rows[0].id, annotatedArticle.link);
                                                                done();
                                                                saveArticleWords(annotatedArticle, result.rows[0].id);
                                                            } else {
                                                                done(client);
                                                            }

                                                            fiiComplete();
                                                        }
                                                    );
                                                });

                                                /*
                                                 fs.writeFile("/tmp/article_" + uuid.v4(), JSON.stringify(annotatedArticle), function(err) {
                                                 if(err) {
                                                 console.log(err);
                                                 } else {
                                                 console.log("The file was saved!");
                                                 }
                                                 fiiComplete();
                                                 });*/
                                            } else {
                                                fiiComplete();
                                            }
                                        });
                                    },
                                    0);
                            }
                        } else {
                            done(client);
                            fiiComplete();
                        }
                    }
                );
            });
        }

        console.log('Processing articles from feed: %s', source.rssFeedUrl);
        async.eachSeries(articles, feedItemIterator, feedItemArrayComplete);

    });
}

function saveArticleWords(article, id) {

    console.log('saving words for articleid: %s', id);
    var wordIds = [];

    // Extract word ids from title.
    for(var i=0; i < article.title.length; i++) {
        if (article.title[i].type === 'word') {
            if (wordIds.indexOf(article.title[i].id) < 0) {
                wordIds.push(article.title[i].id);
            }
        }
    }

    for(var i=0; i < article.article.length; i++) {
        if (article.article[i].type === 'word') {
            if (wordIds.indexOf(article.article[i].id) < 0) {
                wordIds.push(article.article[i].id);
            }
        }
    }

    console.log('found %s unique words in article [%s].', wordIds.length, id);


        pg.connect(connectionString, function (pgcerr, client, done) {

            if (pgcerr) {
                done(client);
                return;
            }

            for(var i=0; i < wordIds.length; i++) {
                console.log('linked article %s to word %s', id, wordIds[i]);
                client.query('INSERT INTO articleword (articleid, wordid) VALUES ($1, $2);',
                    [id, wordIds[i]],
                    function () {
                        //noop

                    }
                );
            }

            done();
        });


    console.log('completed saving word links for article: %s', id);
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
