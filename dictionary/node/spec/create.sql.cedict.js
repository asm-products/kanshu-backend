/**
 * Created by dsandor on 2/8/15.
 *
 * This script will create an SQL script for PG to insert all the
 * directory entries from the node cedict module because Heroku does not
 * like sqlite3.
 *
 */

var ce    = require('node-cc-cedict'),
    fs    = require('fs'),
    pg    = require('pg'),
    async = require('async');

writeDictToPG();
//writeDictToSQLFile();

function writeDictToSQLFile() {
    ce.getAll(function (entries) {
        var output = '';

        for (var i = 0; i < entries.length; i++) {
            output += 'INSERT INTO words (translatedto, traditional, simplified, pronunciation, definitions) VALUES (\'en\', \''
            + entries[i].traditional + '\', \'' + entries[i].simplified + '\', \'' + entries[i].pronunciation + '\', \'' + entries[i].definitions + '\');\n';
        }

        fs.writeFile("./cc-cedict.sql", output, function (err) {
            if (err) {
                console.log(err);
            } else {
                console.log("cc-cedict.sql file created.");
            }
        });
    });
}

function writeDictToPG() {
    var conString = "postgres://localhost/kanshu";
    var sql = 'INSERT INTO words (translatedto, traditional, simplified, pronunciation, definition) VALUES ($1, $2, $3, $4, $5);';

        ce.getAll(function (entries) {
            console.log('adding %s entires', entries.length);
            var count = 0;

            async.eachSeries(entries,
            function(entry, callback) {

                count++;

                pg.connect(conString, function(err, client, done) {
                    if (err) {
                        return console.error('error fetching client from pool', err);
                    }

                    client.query(sql, ['en', entry.traditional, entry.simplified, entry.pronunciation, entry.definitions], function (err, result) {
                        //call `done()` to release the client back to the pool
                        done();

                        if (err) {
                            console.log('%j\n%j\ncount: %s', err, entry, count);

                        }

                        callback();
                    });
                });
            },
            function(err) {
                console.log('done.');
            });

    });
}