/**
 * A collection of postgresql tests for the pg node module.
 * Created by dsandor on 1/27/15.
 *
 */
var pg    = require('pg')
    nconf = require('nconf');

nconf.argv()
    .env()
    .file({ file: '../config.json' });

var conString = nconf.get('connectionString');

describe('postgresql queries against the users table', function() {

    it('should create a user in postgresql', function(done) {

        pg.connect(conString, function(err, client, pgdone) {

            client.query('INSERT INTO users (email, passwordHash) VALUES ($1, $2)',
            ['unit_test_user@unittest.uuu', 'password'], function(err, result) {
                expect(err).toBe(null);
                    pgdone(client);
                    done();
                });

        });
    });

    it('should fail to create a duplicate user', function(done) {
        pg.connect(conString, function(err, client, pgdone) {

            client.query('INSERT INTO users (email, passwordHash) VALUES ($1, $2)',
                ['unit_test_user@unittest.uuu', 'password'], function(err, result) {
                    expect(err).not.toBe(null);
                    pgdone(client);
                    done();
                });

        });
    });

    it('should get the test user by email/pwd', function(done) {
        pg.connect(conString, function(err, client, pgdone) {

            var query = client.query('SELECT * FROM users WHERE email = $1 AND passwordhash = $2',
                ['unit_test_user@unittest.uuu', 'password']);

            query.on('row', function(row, result) {
                console.log('email: %s, passwordhash: %s',
                row.email, row.passwordhash);
                result.addRow(row);
            });

            query.on('error', function(err) {
                pgdone(client);
                done();
            });

            query.on('end', function(result) {
                console.log('%s rows processed', result.rowCount);
                done();
            });
        });
    });

    it('should delete the unit_test_user', function(done) {
        pg.connect(conString, function(err, client, pgdone) {

            client.query('DELETE FROM users WHERE email = $1',
                ['unit_test_user@unittest.uuu'], function(err, result) {
                    expect(err).toBe(null);
                    pgdone(client);
                    done();
                });

        });
    });

});
