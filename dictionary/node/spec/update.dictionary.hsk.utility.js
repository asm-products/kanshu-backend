/**
 * Created by dsandor on 2/14/15.
 */
var fs = require('fs'),
    pg = require('pg');

var hsk = [];
var conString = "postgres://username:password@localhost/database";

function readLines(input, func, level) {
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
    });
}

function func(data, level) {
    console.log('Level %s: %s', level, data);
    hsk.push( { word: data, level: level } );
}

for(var i=1; i<=6; i++) {
    var filePath = '../../docs/HSK Official 2012 L' + i.toString() + '.txt';

    var input = fs.createReadStream(filePath);
    readLines(input, func, i);
}


pg.connect(conString, function(err, client, done) {
    if(err) {
        return console.error('error fetching client from pool', err);
    }
    client.query('SELECT $1::int AS number', ['1'], function(err, result) {
        //call `done()` to release the client back to the pool
        done();

        if(err) {
            return console.error('error running query', err);
        }
        console.log(result.rows[0].number);
        //output: 1
    });
});