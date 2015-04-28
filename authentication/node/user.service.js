/**
 * Created by dsandor on 1/27/15.
 */

var crypto = require('crypto'),
    pg     = require('pg'),
    data   = require('./data.pg.js'),
    uuid   = require('node-uuid');

var log = {},
    connectionString = '',
    initialSessionExpirationMinutes = 10080;

module.exports = {

    login: internalLogin,

    logout: internalLogout,

    createUser: internalCreateUser,

    authenticate: internalAuthenticate,

    getSessionId: internalGetSessionId,

    updateUser: internalUpdateUser,

    validate: internalValidate,

    setLogger: function(value) { log = value; data.setLogger(value); },

    setConnectionString: function(value)
    {
        connectionString = value;
        data.setConnectionString(value);
    },

    setInitialSessionExpirationMinutes: function(value) { initialSessionExpirationMinutes = value; }
};

/**
 * This function attempts to log a user in.
 * Expects Basic authentication headers.
 *
 * @param req - restify request object
 * @param res - restify response object
 * @param next - restify next callback
 */
function internalLogin(req, res, next) {
    log.debug('internalLogin called.');

    var user = {};

    if (typeof req.authorization.basic === 'undefined') {
        res.send(401, 'Basic authentication required.');
        return next();
    }

    log.debug('logging in user', req.authorization.basic.username);

    var errorHandler = function(err) {
        log.error('failed logging in user', err);
        res.send(500, 'Failed authenticating user.');
        return next();
    };

    var completeGetUserHandler = function(userFromDb) {
        log.debug('got user for login', userFromDb);

        user = userFromDb;

        // compare passwordHash from user account to password from user.
        crypto.pbkdf2(req.authorization.basic.password, user.salt, 65535, 128, cryptoCompleteCallback);
    };

    var cryptoCompleteCallback = function(err, derrivedKey) {
        if (err) {
            log.error('failed hashing user provided password', err);
            res.send(500, 'Failed hashing user password.');
            return next();
        }

        var hashedPasswordBase64 = new Buffer( derrivedKey, 'binary' ).toString( 'base64' );

        log.debug('user.passwordHash: %s, hashedPassword: %s',
            user.passwordHash, hashedPasswordBase64);

        if (user.passwordHash === hashedPasswordBase64) {
            log.debug('user logged in successfully, session id:', user.sessionId);

            user.sessionId = uuid.v4();

            data.setUserLoggedIn(function(loginError) {
                    log.error('received an error while updating database with users login status and session id', loginError);

                    res.send(500, 'Failure logging in user.');
                    return next();
                },
                user.email,
                user.sessionId,
                function() {
                    delete user.salt;
                    delete user.passwordHash;

                    res.send(200, {sessionId: user.sessionId, user: user});
                    return next();
                });

        } else {
            log.debug('Password did not match for user', user.email);

            res.send(401, 'Invalid username or password.');
            return next();
        }
    };

    data.getUser(errorHandler, req.authorization.basic.username, completeGetUserHandler);
}

/**
 * This function logs a user out killing their session.
 * @param req - restify request object
 * @param res - restify response object
 * @param next - restify next callback
 */
function internalLogout(req, res, next) {
    log.debug('internalLogout called.');

    if (typeof req.headers.sessionid === 'undefined') {
        log.debug('internalLogout called with no sessionid.');

        res.send(500, 'No session id in headers.  (Please include \'sessionid\' header value)');
        return next();
    }

    var errorHandler = function(err) {
        log.error('an attempt was made to logout which failed', req.headers, err, req.body.email);

        res.send(500, 'Failed logging out user.');
        return next();
    };

    var logoutCompleteHandler = function() {
        log.debug('logged out user with sessionid %s', req.headers.sessionid);

        res.send(200, { message: 'User logged out.' });
        return next();
    };

    data.logoutUser(errorHandler, req.headers.sessionid, logoutCompleteHandler);
}

/**
 * This function creates a user.
 * @param req - restify request object
 * @param res - restify response object
 * @param next - restify next callback
 *
 * Expected post data:
 * {
 *   "password": "user's password",
 *   "email": "somebody@domain.com",
 *   "userBio": "some interesting text about the user."
 * }
 *
 * Response:
 * http 200 - user was successfully created
 * http 500 - there was a failure, reason returned in body as: { message: 'some failure reason' }
 *
 */
function internalCreateUser(req, res, next) {
    log.debug('internalCreateUser called.');

    var salt = uuid.v4();

    var cryptoComplete = function(cryptoError, derrivedKey) {
        if (!cryptoError) {

            var hashedPasswordBase64 = new Buffer( derrivedKey, 'binary' ).toString( 'base64' );

            var user = {
                email: req.body.email,
                passwordHash: hashedPasswordBase64,
                salt: salt,
                userBio: req.body.userBio,
                username: req.body.username,
                profileImageUrl: req.body.profileImageUrl,
                hsklevel: req.body.hsklevel
            };

            data.createUser(
                function(err) {
                    if (err.code == 23505) {
                        res.send(500, { code: 23505, message: 'User already exists.' });
                    } else {
                        res.send(500, err);
                    }

                    next();
                },
                user,
                function() {
                    res.send(200);
                    next();
                });

        } else {
            res.send(500, {message: 'failed to hash password'});
            return next();
        }
    };

    // NOTE: If you change the hash size you need to make sure the database column can accommodate the hash size * 3.
    crypto.pbkdf2(req.body.password, salt, 65535, 128, cryptoComplete);
}

/**
 * This function is called to authenticate the user.
 * @param req - restify request object
 * @param res - restify response object
 * @param next - restify next callback
 */
function internalAuthenticate(req, res, next) {
    log.debug('authenticate called.');

    // TODO: skip auth for /createuser calls

    next();
}

/**
 * This function will get the user's sessionid.
 * @param req - restify request object
 * @param res - restify response object
 * @param next - restify next callback
 */
function internalGetSessionId(req, res, next) {

    next();
}

function internalUpdateUser(req, res, next) {
    log.debug('internalUpdateUser called.');

    var user = {
        email: req.body.email,
        userBio: req.body.userBio,
        country: req.body.country,
        username: req.body.username,
        profileImageUrl: req.body.profileImageUrl,
        hsklevel: req.body.hsklevel
    };

    var errorHandler = function(err) {
        log.error('fialed updating user', user, err);

        res.send(500, 'Failed updating user.');
        return next();
    };

    // This is a basic update of bio and country, no password so there is no crypto stuff to do.
    if (typeof req.body.password === 'undefined') { // Update userbio & country
        data.updateUser(errorHandler, user, function() {
           res.send(200, {message: 'Update succeeded.'});
            return next();
        });
    }

    var salt = uuid.v4();

    var cryptoComplete = function(cryptoError, derrivedKey) {
        if (!cryptoError) {

            var hashedPasswordBase64 = new Buffer( derrivedKey, 'binary' ).toString( 'base64' );

            var user = {
                email: req.body.email,
                sessionId: req.headers.sessionid,
                passwordHash: hashedPasswordBase64,
                salt: salt,
                userBio: req.body.userBio,
                country: req.body.country,
                username: req.body.username,
                profileImageUrl: req.body.profileImageUrl,
                hsklevel: req.body.hsklevel
            };

            data.updateUser(
                errorHandler,
                user,
                function() {
                    res.send(200, {message: 'Update succeeded.  Password reset.'});
                    next();
                });

        } else {
            res.send(500, {message: 'failed to hash password'});
            return next();
        }
    };

    // NOTE: If you change the hash size you need to make sure the database column can accommodate the hash size * 3.
    crypto.pbkdf2(req.body.password, salt, 65535, 128, cryptoComplete);

}

/**
 * This function will validate the sessionid passed in to the header.
 * @param req - restify request object
 * @param res - restify response object
 * @param next - restify next callback
 */
function internalValidate(req, res, next) {
    var sessionId = req.headers.sessionid;

    if (typeof sessionId === 'undefined') {
        res.send(401, { message: 'No sessionid header supplied.'});
        return next();
    }

    var errorHandler = function(err) {
        var msg = 'An error occurred validating session.';

        res.send(500, {message: msg });
        log.error(msg, err);

        return next();
    };

    var completeHandler = function(result) {
        if (result.isValid) {
            res.send(200, { mesage: 'Session validates ok.' });
            return next();
        }

        res.send(401, { mesage: 'Invalid session.' });
        return next();
    };

    data.validateSession(errorHandler, sessionId, completeHandler);
}