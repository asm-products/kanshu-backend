/**
 * Created by dsandor on 2/14/15.
 */
var fs = require('fs');

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
}
for(var i=1; i<=6; i++) {
    var filePath = '../../docs/HSK Official 2012 L' + i.toString() + '.txt';

    var input = fs.createReadStream(filePath);
    readLines(input, func, i);
}
