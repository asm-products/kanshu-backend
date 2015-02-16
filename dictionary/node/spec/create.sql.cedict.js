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

var hsk = [];
var conString = "postgres://localhost/kanshu";

//writeDictToPG();
//writeDictToSQLFile();

console.log('updating db with hsk levels.');

initializeHskLevels(function() {
    console.log('found %s hsk levels', hsk.length);

    updatePGWithHskLevels(function() {
        console.log('completed updating PG.');
    });
});

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


function readLines(input, func, level, complete) {
    var remaining = '';

    input.on('data', function(data) {
        remaining += data;
        var index = remaining.indexOf('\n');
        while (index > -1) {
            var line = remaining.substring(0, index);
            remaining = remaining.substring(index + 1);
            func(line, level);
            index = remaining.indexOf('\n');
        }
    });

    input.on('end', function() {
        if (remaining.length > 0) {
            func(remaining, level);
        }
        complete();
    });
}

function cacheLine(data, level) {
    console.log('Level %s: %s', level, data);
    hsk.push({ word: data.replace('\r', ''), level: level });
}

function initializeHskLevels(complete) {

    var files = [];
    for (var i = 1; i <= 6; i++) {
        var filePath = '../../docs/HSK Official 2012 L' + i.toString() + '.txt';
        files.push({path: filePath, level: i});
    }

    async.each(files,
    function(file, callback) {
        var input = fs.createReadStream(file.path);
        readLines(input, cacheLine, file.level, callback);
    },
    function(err) {
        if (err) {
            console.log('error: %j', err);
        }
        complete();
    });


}

function updatePGWithHskLevels(complete) {
    var sql = 'UPDATE words SET hsklevel = $1 WHERE traditional = $2 OR simplified = $2';

    async.each(hsk, function(hskword, callback) {
            pg.connect(conString, function (err, client, done) {
                if (err) {
                    return console.error('error fetching client from pool', err);
                }

                client.query(sql, [hskword.level, hskword.word], function (err, result) {

                    done();

                    if (err) {
                        console.log('%j\n%j\ncount: %s', err, entry, count);
                    }

                    callback();
                });
            });
    },
    function(err) {
        complete();
    });

}