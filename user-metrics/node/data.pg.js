/**
 * TODO: Write the following functions in this module.
 * - Save word.
 * - Mark word mastered.
 * - Get user's words.
 * - Delete a character from user's list.
 * - Get user statistics:
 *    - Words mastered vs. words saved.
 *    - Words mastered per week?
 *    - Words mastered per HSK level.
 * - Save article for user.
 *
 * Created by dsandor on 2/28/15.
 */
var pg = require('pg');

module.exports = {

    saveWord: {}, // TODO: Allow user to save a word

    setLogger: function(value) { log = value; },

    setConnectionString: function(value) { connectionString = value; }

};

var log = {},
    connectionString = '';
/**
 * Links the user's id to an article id.  The user id is determined by the session token passed
 * in the header of the POST request.
 *
 * @param articleId - the article Id to link to the user.
 * @param complete - the callback that is called when the process completes.  'err' object is passed to
 * the callback if there was an error linking the article to the user.
 */
function internalLinkArticle(articleId, complete) {

    // TODO: finish this part, get user from session id.

    /*
    log.debug('Link article called for articleId: %s and userSession: %s', articleId, );

    pg.connect(connectionString, function(pgcerr, client, done) {

        if (pgcerr) {
            if (typeof err != 'undefined') err(pgcerr);

            done(client);
            return callback(err);
        }

        var query = client.query('INSERT INTO userarticle (userid, articleid) VALUES ($1, $2)', [translatedTo]);

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
    */

}
