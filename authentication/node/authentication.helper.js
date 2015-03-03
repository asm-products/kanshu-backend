/**
 * Created by dsandor on 2/28/15.
 */
var data   = require('./data.pg.js');

module.exports = {
    validateSession: internalValidateSession
};

/**
 * Validates a session against the database.
 * @param sessionId - the session id.
 * @param complete - Callback passes an object as the argument that looks like this: { isValid: true/false, message: '' }
 * @returns {*} - nothing
 */
function internalValidateSession(sessionId, complete) {

    if (typeof sessionId === 'undefined') {
        return complete({ isValid: false, message: 'No sessionid header supplied.' });
    }

    var errorHandler = function(err) {
        var msg = 'An error occurred validating session.';

        return complete({ isValid: false, message: msg });
    };

    var completeHandler = function(result) {
        if (result.isValid) {
            return complete(result);
        }

        return complete({ isValid: false, message: 'Invalid session.' });
    };

    data.validateSession(errorHandler, sessionId, completeHandler);
}