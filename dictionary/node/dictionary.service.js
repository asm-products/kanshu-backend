var cedict = require('node-cc-cedict');
var log = {};

module.exports = {
    lookup: internalLookup,

    setLogger: function(value) { log = value; }
};

// example: 你好

function internalLookup(req, res, next) {
    cedict.searchByChinese(req.params.phrase, function(words){
        res.send(200, { words: words });
        return next();
    });
}
