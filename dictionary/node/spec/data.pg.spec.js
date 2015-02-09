var data = require('../data.pg.js'),
    bunyan = require('bunyan');

var log = bunyan.createLogger({ name: 'data.pg.spec', level: 'debug' });

data.setLogger(log);
data.setConnectionString('postgres://localhost/kanshu');

describe('PG Data layer for the dictionary api', function() {

    it('should read all the words from the dictionary', function(done) {

        var errorHandler = function(err) {
            done(err);
        };

        var completeHandler = function(words) {
            expect(words).not.toBe(null);
            expect(words.length).toBeGreaterThan(0);

            console.log('got %s words', words.length);
            done();
        };

        data.getEntireDictionary(errorHandler, 'en', completeHandler);
    });
});