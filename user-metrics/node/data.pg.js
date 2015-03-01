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
var pg         = require('pg'),
    authHelper = require('../../authentication/node/authentication.helper.js');

module.exports = {

    saveWord: {}, // TODO: Allow user to save a word

    linkArticle: internalLinkArticle,

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
