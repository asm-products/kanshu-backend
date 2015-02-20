/**
 * Unit tests for the data.pg.js code.
 * Created by dsandor on 1/28/15.
 */
var pg     = require('pg'),
    bunyan = require('bunyan'),
    data   = require('../data.pg.js'),
    uuid   = require('node-uuid'),
    crypto = require('crypto'),
    nconf  = require('nconf');

var log = bunyan.createLogger({ name: 'postgresql unit test', level: 'debug'});

nconf.argv()
    .env()
    .file({ file: '../config.json' });

var conString = nconf.get('DATABASE_URL');

var testUserEmail = 'pg.data.unittest@test.com';
var testUserSessionId = '';

data.setConnectionString(conString);
data.setLogger(log);

describe('postgress data layer', function() {

    it('clean up existing test user', function(done) {
        pg.connect(conString, function(pgcerr, client, pgdone) {

            if (pgcerr) {
                if (typeof err != 'undefined') err(pgcerr);

                done(client);
                return;
            }

            client.query('DELETE FROM users WHERE email = $1;',
                [testUserEmail], function (pgqerr, result) {
                    pgdone();
                    done();
                });
        });
    });

    it('should create a user', function(done) {
        var salt = uuid.v4();
        var derrivedKey = crypto.pbkdf2Sync('password', salt, 65535, 128);
        var hashedPasswordBase64 = new Buffer( derrivedKey, 'binary' ).toString( 'base64' );

        var user = {
            email: testUserEmail,
            passwordHash: hashedPasswordBase64,
            salt: salt,
            userBio: 'userbio',
            country: 'United States'
        };

        data.createUser(
            function(err) {
                if (err.code == 23505) {
                    log.debug('User exists.');
                } else {
                    log.debug('some other pg error occurred.');
                }

                log.debug(err);
                done(err);
            },
            user,
            function() {
                done();
            });

    });

    it('should get user by email', function(done) {
        data.getUser(
            function(err) {
                return done('failed retreiving user');
            },
            testUserEmail,
            function(user) {
                expect(user).not.toBe(null);
                log.debug('got user', user);
                done();
            }
        );
    });

    it('should set a user as logged in', function(done) {

        testUserSessionId = uuid.v4();

        var errorHandler = function(err) {
            done(err);
        };

        data.setUserLoggedIn(errorHandler, testUserEmail, testUserSessionId, function() {
           done();
        });

    });

    it('should validate a session', function(done) {

        var errorHandler = function(err) {
            done(err);
        };

        data.validateSession(errorHandler, testUserEmail, testUserSessionId, function(isValid) {
           expect(isValid).toBe(true);
           done();
        });

    });

});
