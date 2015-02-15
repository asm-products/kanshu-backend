/**
 * This module is used to consolidate the data calls in one place so the backend
 * persistence store can be switched out with minimal effort.
 *
 * Created by dsandor on 1/28/15.
 */
var pg = require('pg');

module.exports = {

    getEntireDictionary: internalGetEntireDictionary,

    setLogger: function(value) { log = value; },

    setConnectionString: function(value) { connectionString = value; }

};

var log = {},
    connectionString = '';
/**
 * Gets the entire dictionary by translatedTo (e.g. en for english, es for spanish, fr for french)
 * @param err - a callback that is called if there is an error.
 * @param translatedTo - (e.g. en for english, es for spanish, fr for french)
 * @param complete - the callback that is called when the process completes.  Takes a parameter which will be the list of dictionary entries.
 */
function internalGetEntireDictionary(err, translatedTo, complete) {
    log.debug('GetEntireDictionary called for translatedTo: %s', translatedTo);

    pg.connect(connectionString, function(pgcerr, client, done) {

        if (pgcerr) {
            if (typeof err != 'undefined') err(pgcerr);

            done(client);
            return err
        }

        var query = client.query('SELECT * FROM words WHERE translatedto=$1 ORDER BY traditional', [translatedTo]);

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

}
