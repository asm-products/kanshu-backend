/**
 * TODO: Write the following functions in this module.
 * - X Save word.
 * - X Mark word mastered.
 * - X Get user's words.
 * - X Delete a character from user's list.
 * - Get user statistics:
 *    - X Words mastered vs. words saved.
 *    - Words mastered per week?
 *    - X Words mastered per HSK level.
 * - X Save article for user.
 *
 * Created by dsandor on 2/28/15.
 */
var pg         = require('pg'),
    authHelper = require('../../authentication/node/authentication.helper.js');

module.exports = {

    saveWord: internalSaveWord,

    deleteWord: internalDeleteWord,

    linkArticle: internalLinkArticle,

    getWordsByUser: internalGetWordsByUser,

    markWordMastered: internalMarkWordMastered,

    getWordsMasteredMetric: internalGetWordsMasteredMetric,

    getMasteredByLevel: internalGetMasteredByLevel,

    setLogger: function(value) { log = value; },

    setConnectionString: function(value) { connectionString = value; }

};

var log = {},
    connectionString = '';

/**
 * Deletes a word from a user's saved word list.  The user id is determined by the session token passed
 * in the header of the POST request.
 *
 * @param wordId - the word Id to delete.
 * @param sessionId - the session id of the user.
 * @param complete - the callback that is called when the process completes.  'err' object is passed to
 * the callback if there was an error deleting row.
 */
function internalDeleteWord(wordId, sessionId, complete) {

    log.debug('Delete word called for wordId: %s and sessionId: %s', wordId, sessionId);

    var validateSessionCompleteHandler = function(result) {
        if (!result.isValid) {
            return complete({ message: result.message });
        }

        pg.connect(connectionString, function(pgcerr, client, done) {

            if (pgcerr) {
                if (typeof err != 'undefined') err(pgcerr);

                done(client);
                return callback(err);
            }

            client.query('DELETE FROM savedword WHERE userid=$1 AND wordid=$2;', [result.user.id, wordId],
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
    };

    authHelper.validateSession(sessionId, validateSessionCompleteHandler);
}

/**
 * Saves a word in the user's word list.  The user id is determined by the session token passed
 * in the header of the POST request.
 *
 * @param wordId - the word Id to save.
 * @param sessionId - the session id of the user.
 * @param complete - the callback that is called when the process completes.  'err' object is passed to
 * the callback if there was an error linking the article to the user.
 */
function internalSaveWord(wordId, sessionId, complete) {

    log.debug('Save word called for wordId: %s and sessionId: %s', wordId, sessionId);

    var validateSessionCompleteHandler = function(result) {
        if (!result.isValid) {
            return complete({ message: result.message });
        }

        pg.connect(connectionString, function(pgcerr, client, done) {

            if (pgcerr) {
                if (typeof err != 'undefined') err(pgcerr);

                done(client);
                return callback(err);
            }

            client.query('INSERT INTO savedword (userid, wordid, saveddate) VALUES ($1, $2, $3)', [result.user.id, wordId, Date.now()],
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
    };

    authHelper.validateSession(sessionId, validateSessionCompleteHandler);
}

/**
 * Links the user's id to an article id.  The user id is determined by the session token passed
 * in the header of the POST request.
 *
 * @param articleId - the article Id to link to the user.
 * @param sessionId - the session id of the user.
 * @param complete - the callback that is called when the process completes.  'err' object is passed to
 * the callback if there was an error linking the article to the user.
 */
function internalLinkArticle(articleId, sessionId, complete) {

    log.debug('Link article called for articleId: %s and sessionId: %s', articleId, sessionId);

    var validateSessionCompleteHandler = function(result) {
        if (!result.isValid) {
            return complete({ message: result.message });
        }

        pg.connect(connectionString, function(pgcerr, client, done) {

            if (pgcerr) {
                if (typeof err != 'undefined') err(pgcerr);

                done(client);
                return callback(err);
            }

            client.query('INSERT INTO userarticle (userid, articleid) VALUES ($1, $2)', [result.user.id, articleId],
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
    };

    authHelper.validateSession(sessionId, validateSessionCompleteHandler);
}

/**
 * Gets all the words for the user including saveddate, ismastered, and mastereddate.
 * @param sessionId - the user's session id.
 * @param translatedTo - the language for the definition.
 * @param complete - returns an array of word objects with the addition of saveddate, ismastered, and mastereddate.
 */
function internalGetWordsByUser(sessionId, translatedTo, complete) {

    var validateSessionCompleteHandler = function(result) {
        if (!result.isValid) {
            return complete({message: result.message});
        }

        var user = result.user;

        pg.connect(connectionString, function (pgcerr, client, done) {

            if (pgcerr) {
                if (typeof err != 'undefined') err(pgcerr);

                done(client);
                return complete();
            }

            var sql = 'select w.*, sw.ismastered, sw.mastereddate, sw.saveddate FROM savedword sw ' +
                'INNER JOIN words w on sw.wordid = w.id where sw.userid = $1 AND w.transaltedto = $2 order by hsklevel desc;';

            var query = client.query(sql, [user.id, translatedTo]);

            query.on('row', function (row, result) {
                result.addRow(row);
            });

            query.on('error', function (pgerr) {
                done(client);
                return err(pgerr);
            });

            query.on('end', function (result) {
                log.debug('%s rows found', result.rowCount);
                done();
                var words = [];

                for (var i = 0; i < result.rowCount; i++) {
                    words.push({
                        id: result.rows[i].id,
                        translatedto:  result.rows[i].translatedto,
                        traditional:   result.rows[i].traditional,
                        simplified:    result.rows[i].simplified,
                        pronunciation: result.rows[i].pronunciation,
                        hsklevel:      result.rows[i].hsklevel,
                        definitions:   [result.rows[i].definition],
                        ismastered:    result.rows[i].ismastered,
                        mastereddate:  result.rows[i].mastereddate,
                        saveddate:     result.saveddate
                    });
                }

                return complete(words);
            });

        });
    };

    authHelper.validateSession(sessionId, validateSessionCompleteHandler);
}

/**
 * Marks a user's word as mastered.
 * @param sessionId - the user's session id.
 * @param wordId - the word id.
 * @param complete - called when done.
 */
function internalMarkWordMastered(wordId, sessionId, complete) {
    log.debug('Mark word mastered called for articleId: %s, wordId: %s, and sessionId: %s', articleId, wordId, sessionId);

    var validateSessionCompleteHandler = function(result) {
        if (!result.isValid) {
            return complete({ message: result.message });
        }

        pg.connect(connectionString, function(pgcerr, client, done) {

            if (pgcerr) {
                if (typeof err != 'undefined') err(pgcerr);

                done(client);
                return callback(err);
            }

            client.query('UPDATE savedword SET ismastered=TRUE, mastereddate=current_date WHERE userid=$1 AND wordid=$2;', [result.user.id, wordId],
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
    };

    authHelper.validateSession(sessionId, validateSessionCompleteHandler);
}

/**
 * Gets the user's mastered word count and unmastered word count.
 * @param sessionId - the user's session id.
 * @param complete - a callback that passes an object back that looks like this: { mastered: 0, unmastered: 0 }
 */
function internalGetWordsMasteredMetric(sessionId, complete) {

    var sql = 'SELECT (SELECT count(0) FROM savedword WHERE userid = $1 AND ismastered = TRUE) as mastered, ' +
              ' (SELECT count(0) FROM savedword WHERE userid = $1 AND ismastered = FALSE) as unmastered;';

    var validateSessionCompleteHandler = function(result) {
        if (!result.isValid) {
            return complete({message: result.message});
        }

        var user = result.user;

        pg.connect(connectionString, function (pgcerr, client, done) {

            if (pgcerr) {
                if (typeof err != 'undefined') err(pgcerr);

                done(client);
                return err
            }
            var query = client.query(sql, [user.id]);

            query.on('row', function (row, result) {
                result.addRow(row);
            });

            query.on('error', function (pgerr) {
                done(client);
                return err(pgerr);
            });

            query.on('end', function (result) {
                log.debug('%s rows found', result.rowCount);
                done();
                var words = [];

                if (result.rowCount == 1) {
                    var masteredCount = result.rows[0].mastered;
                    var unmasteredCount = result.rows[0].unmastered;

                    complete({ mastered: masteredCount, unmastered: unmasteredCount });
                }

                return complete();
            });

        });
    };

    authHelper.validateSession(sessionId, validateSessionCompleteHandler);
}

/**
 * Gets the mastered metrics by level: { level0: 0, level1: 0, ... level6: 0 }
 * Where level 0 are the words that are not in the HSK list.
 * @param sessionId - the user's session id.
 * @param complete - callback that is called with the result object. If an error occurred no object is returned.
 */
function internalGetMasteredByLevel(sessionId, complete) {

    var sql = 'SELECT ' +
        '(SELECT count(0) FROM savedword sw INNER JOIN words w on sw.wordid = w.id AND w.translatedto = $2 WHERE userid =  $1 AND w.hsklevel = 1) as level1, ' +
        '(SELECT count(0) FROM savedword sw INNER JOIN words w on sw.wordid = w.id AND w.translatedto = $2  WHERE userid = $1 AND w.hsklevel = 2) as level2, ' +
        '(SELECT count(0) FROM savedword sw INNER JOIN words w on sw.wordid = w.id AND w.translatedto = $2  WHERE userid = $1 AND w.hsklevel = 3) as level3, ' +
        '(SELECT count(0) FROM savedword sw INNER JOIN words w on sw.wordid = w.id AND w.translatedto = $2  WHERE userid = $1 AND w.hsklevel = 4) as level4, ' +
        '(SELECT count(0) FROM savedword sw INNER JOIN words w on sw.wordid = w.id AND w.translatedto = $2  WHERE userid = $1 AND w.hsklevel = 5) as level5, ' +
        '(SELECT count(0) FROM savedword sw INNER JOIN words w on sw.wordid = w.id AND w.translatedto = $2  WHERE userid = $1 AND w.hsklevel = 6) as level6, ' +
        '(SELECT count(0) FROM savedword sw INNER JOIN words w on sw.wordid = w.id AND w.translatedto = $2  WHERE userid = $1 AND (w.hsklevel < 1 OR w.hsklevel > 6)) as level0';

    var validateSessionCompleteHandler = function(result) {
        if (!result.isValid) {
            return complete({message: result.message});
        }

        var user = result.user;

        pg.connect(connectionString, function (pgcerr, client, done) {

            if (pgcerr) {
                if (typeof err != 'undefined') err(pgcerr);

                done(client);
                return err
            }
            var query = client.query(sql, [user.id, 'en']); // TODO: Deal with hard coded translatedTo value.

            query.on('row', function (row, result) {
                result.addRow(row);
            });

            query.on('error', function (pgerr) {
                done(client);
                return err(pgerr);
            });

            query.on('end', function (result) {
                log.debug('%s rows found', result.rowCount);
                done();

                if (result.rowCount == 1) {
                    complete({
                        level0: result.rows[0].level0,
                        level1: result.rows[0].level1,
                        level2: result.rows[0].level2,
                        level3: result.rows[0].level3,
                        level4: result.rows[0].level4,
                        level5: result.rows[0].level5,
                        level6: result.rows[0].level6
                    });
                }

                return complete();
            });

        });
    };

    authHelper.validateSession(sessionId, validateSessionCompleteHandler);

}

