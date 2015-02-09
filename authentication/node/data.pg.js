/**
 * This module is used to consolidate the data calls in one place so the backend
 * persistence store can be switched out with minimal effort.
 *
 * Created by dsandor on 1/28/15.
 */
var pg = require('pg');

module.exports = {

    /**
     * Creates a user record, complete is called if it is successful otherwise err is called.
     */
    createUser: internalCreateUser,

    updateUser: internalUpdateUser,

    getUser: internalGetUser,

    validateSession: internalValidateUserSession,

    setUserLoggedIn: internalSetUserLoggedIn,

    logoutUser: internalLogoutUser,

    setLogger: function(value) { log = value; },

    setConnectionString: function(value) { connectionString = value; }

};

var log = {},
    connectionString = '';

/**
 * Creates a user.  Expects a user object like:
 * { email: String, passwordHash: String, salt: String, userBio: String }
 *
 * @param err - If set, this callback is called with the PG error object.
 * @param user - The user data to create.
 * @param complete - Callback called when the process completes successfully.
 */
function internalCreateUser(err, user, complete) {
    log.debug('createUser called', user);

    pg.connect(connectionString, function(pgcerr, client, done) {

        if (pgcerr) {
            if (typeof err != 'undefined') err(pgcerr);

            done(client);
            return;
        }

        client.query('INSERT INTO users (email, passwordHash, salt, userBio, country) VALUES ($1, $2, $3, $4, $5)',
            [user.email, user.passwordHash, user.salt, user.userBio, user.country], function (pgqerr, result) {
                if (!pgqerr) {
                    done();
                    complete();
                } else {
                    done(client);
                    return err(pgqerr);
                }
            });
    });
}

/**
 * Updates the last login date and sets the session id.
 * @param err - If set, this callback is called with the PG error object.
 * @param email - The user's email to update.
 * @param sessionId - The user's new session id.
 * @param complete - Callback called when the process completes successfully.
 */
function internalSetUserLoggedIn(err, email, sessionId, complete) {
    log.debug('SetUserLoginTimeAndSession called', email, sessionId);

    pg.connect(connectionString, function(pgcerr, client, done) {

        if (pgcerr) {
            if (typeof err != 'undefined') err(pgcerr);

            done(client);
            return;
        }

        client.query("UPDATE users SET sessionid=$1, lastlogin=timezone('UTC', now()), sessionexpirationdate=timezone('UTC', now()) + INTERVAL '30 minutes' WHERE email=$2;",
            [sessionId, email], function (pgqerr, result) {
                if (!pgqerr) {
                    done();
                    complete();
                } else {
                    done(client);
                    return err(pgqerr);
                }
            });
    });
}

/**
 * Updates the last login date and sets the session id.
 * @param err - If set, this callback is called with the PG error object.
 * @param email - The user's email to update.
 * @param sessionId - The user's new session id.
 * @param complete - Callback called when the process completes successfully. Passes isValid boolean back.
 */
function internalValidateUserSession(err, email, sessionId, complete) {
    log.debug('validateUserSession called', email, sessionId);

    pg.connect(connectionString, function(pgcerr, client, done) {

        if (pgcerr) {
            if (typeof err != 'undefined') err(pgcerr);

            done(client);
            return;
        }

        // get the total number of visits today (including the current visit)
        client.query("SELECT COUNT(email) FROM users WHERE email=$1 AND sessionId=$2 AND sessionexpirationdate > timezone('UTC', now());",
            [email, sessionId],
            function(qerr, result) {

            // handle an error from the query
            if(qerr) {
                if (typeof qerr != 'undefined') {
                    err(qerr);
                }
                done();
                return;
            }

            done();

            if (result.rowCount == 1) { // valid session
                touchUserSession(
                    function (error) {
                        log.error('failed touching user session', error);
                        return err(error);
                    },
                    email,
                    function () {
                        log.debug('successfully touched user session');
                        complete(true);
                    });
            }
            else // invalid session
                complete(false);
        });
    });
}

function touchUserSession(err, email, complete) {
    pg.connect(connectionString, function(pgcerr, client, done) {

        if (pgcerr) {
            if (typeof err != 'undefined') err(pgcerr);

            done(client);
            return;
        }

        client.query("UPDATE users SET sessionexpirationdate=timezone('UTC', now()) + INTERVAL '30 minutes' WHERE email=$1;",
            [email], function (pgqerr, result) {
                if (!pgqerr) {
                    done();
                    complete();
                } else {
                    done(client);
                    return err(pgqerr);
                }
            });
    });
}

function internalGetUser(err, email, complete) {
    log.debug('getUser called', email);

    pg.connect(connectionString, function(pgcerr, client, done) {

        if (pgcerr) {
            if (typeof err != 'undefined') err(pgcerr);

            done(client);
            return;
        }

        var query = client.query('SELECT * FROM users WHERE email=$1', [email]);

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

            if (result.rowCount != 1) {
                log.error('Get user by email returned more than one row.', result.rows);
                return complete();
            }

            var user = {
                email: result.rows[0].email,
                salt: result.rows[0].salt,
                lastLogin: result.rows[0].sessionid,
                userBio: result.rows[0].userBio,
                passwordHash: result.rows[0].passwordhash
            };

            return complete(user);
        });


    });
}

function internalLogoutUser(err, sessionId, complete) {
    log.debug('Logout user called', sessionId);

    pg.connect(connectionString, function(pgcerr, client, done) {

        if (pgcerr) {
            if (typeof err != 'undefined') err(pgcerr);

            done(client);
            return;
        }

        client.query("UPDATE users SET sessionid=null, sessionexpirationdate=timezone('UTC', now()) WHERE sessionid=$1;",
            [sessionId], function (pgqerr, result) {
                if (!pgqerr) {
                    done();

                    if (result.rowCount == 0) {
                        log.debug('logout user called for sessionid %s but it did not exist so the user was already logged out.', sessionId);
                    } else {
                        log.debug('logout found sessionid %s and removed it from the associated user record.', sessionId);
                    }

                    complete();
                } else {
                    done(client);
                    return err(pgqerr);
                }
            });
    });
}

/**
 * Updates a user.  Expects a user object like:
 * { email: String, sessionId: String, passwordHash: String, userBio: String }
 *
 * NOTE: passwordHash is optional, if it is not specified it will not be updated.
 *
 * @param err - If set, this callback is called with the PG error object.
 * @param user - The user data to create.
 * @param complete - Callback called when the process completes successfully.
 */
function internalUpdateUser(err, user, complete) {
    log.debug('updateUser called', user);

    pg.connect(connectionString, function(pgcerr, client, done) {

        if (pgcerr) {
            if (typeof err != 'undefined') err(pgcerr);

            done(client);
            return;
        }

        if (typeof user.passwordHash != 'undefined') { // password specified update that too.
            client.query('UPDATE users SET passwordHash=$3, userBio=$4, country=$5, salt=$6 WHERE email=$1 AND sessionId=$2',
                [user.email, user.sessionId, user.passwordHash, user.userBio, user.country, user.salt], function (pgqerr, result) {
                    if (!pgqerr) {
                        done();

                        if (result.rowCount == 0) {
                            return err({message: 'could not update user record with provided email and sessionid'});
                        }

                        complete();
                    } else {
                        done(client);
                        return err(pgqerr);
                    }
                });
        } else { // NO PASSWORD so do not update that.
            client.query('UPDATE users SET userBio=$3, country=$4 WHERE email=$1 AND sessionId=$2',
                [user.email, user.sessionId, user.userBio, user.country], function (pgqerr, result) {
                    if (!pgqerr) {
                        done();

                        if (result.rowCount == 0) {
                            return err({message: 'could not update user record with provided email and sessionid'});
                        }

                        complete();
                    } else {
                        done(client);
                        return err(pgqerr);
                    }
                });
        }

    });
}
