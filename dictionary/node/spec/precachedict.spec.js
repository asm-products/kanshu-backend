var
    ce          = require('node-cc-cedict'),
    NodeCache   = require('node-cache');

var wordCache = new NodeCache();

ce.getAll(function(words) {
   console.log('got %s words from sqlite dictionary', words.length);

    for(var i=0; i < words.length; i++) {
        wordCache.set(words[i].traditional, words[i]);

        if (words[i].traditional != words[i].simplified)
            wordCache.set(words[i].simplified, words[i]);
    }

    console.log('cached all words');
});