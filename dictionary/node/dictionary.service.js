var feed        = require('feed-read'),
    ce          = require('node-cc-cedict'),
    async       = require('async'),
    NodeCache   = require('node-cache'),
    typechecker = require('typechecker'),
    cedict      = require('node-cc-cedict'),
    hsk         = require('hsk-words');

var cache = new NodeCache();
var log = {};

module.exports = {
    lookup: internalLookup,

    processFeed: internalProcessFeed,

    setLogger: function(value) { log = value; }
};

// example: 你好

function internalLookup(req, res, next) {
    cedict.searchByChinese(req.params.phrase, function(words){
        res.send(200, { words: words });
        return next();
    });
}

// TODO: Finish this off so that we can take an RSS feed url and process all the articles.
function internalProcessFeed(req, res, next) {

    feed(req.body.url, function(err, articles) {
        if (err) throw err;
        // Each article has the following properties:
        //
        //   * "title"     - The article title (String).
        //   * "author"    - The author's name (String).
        //   * "link"      - The original article link (String).
        //   * "content"   - The HTML content of the article (String).
        //   * "published" - The date that the article was published (Date).
        //   * "feed"      - {name, source, link}
        //

        console.log('found rss feed: %s, processing article: %s', req.body.url, req.body.articleIndex);

        processArticle(articles[req.body.articleIndex], function(annotatedArticle) {
           res.send(annotatedArticle);
            next();
        });

    });
}

function processArticle(article, completeProcessArticle) {


    var segmentParserCompleteHander = function(segments, segmentSeparators, masterList) {
        //var startDate = Date.now();
        //console.log('parsed article[%s], segments: %s, segmentSeparators: %s', articleIndex, segments.length, segmentSeparators.length);

        var annotatedArticle = [];

        console.log('segments: %j', segments);
        console.log('segmentSeparators: %j', segmentSeparators);
        console.log('masterList: %j', masterList);

        async.eachSeries(masterList, function(segment, complete) {

                getAnnotatedSegment(segment, function(result) {

                    for(var i =0; i < result.length; i++) {
                        annotatedArticle.push(result[i]);
                    }
                    /*var phrase = '';

                    for(var i=0; i < result.length; i++) {
                        phrase += result[i].segment;
                        if (typeof result[i].words != 'undefined' && result[i].words.length >= 1) {
                            phrase += ' (' + result[i].words[0].pronunciation + ') ';
                        } else {
                            phrase += ' (??) ';
                        }
                    }
                    */
                    //console.log('phrase: %s', phrase);
                    complete();
                });
            },
            function(err) {

                if (err)
                    console.log('ERROR: %s', err);
                else {
                    // TODO: Sort the article segments before returning.
                    completeProcessArticle(annotatedArticle);
                }
            });

    };

    parseSegments(article.content, segmentParserCompleteHander);


}



// Go through the content one char at a time.  Concat a string until hit punctuation or end.
// When hit punctuation or end push this string to an array.
// store punctuation in second array
// take all of the segments in the array and word search length, then length -1 until word is found
// add to word set array for that segment.
// keep parsing next set of chars until all of segment processed.
// start outputting text.  processed words end in punctuation at array element of same index until end.



// Find segments.  Start at left and copy all chars until hit a punctuation.
// then take all punctuation or space until you hit a non punctuation or space or end.  This is the segment separator for the same index as the segment.

function parseSegments(content, complete) {
    var tempSegment = '';
    var segments = [];
    var segmentSeparators = [];
    var masterSegmentList = [];
    var punctuation = {},
        wordSegment = {};

    var segmentIndex = 0;

    for(var i=0; i < content.length; i++)
    {
        if (!isPunctuation(content.charAt(i))) {
            tempSegment += content.charAt(i);
        }
        else
        {
            if (tempSegment.length > 0) {
                wordSegment = { index: segmentIndex, content: tempSegment, type: 'word' };

                segments.push(wordSegment);
                masterSegmentList.push(wordSegment);
                segmentIndex++;
                tempSegment = '';
            }

            var punctuationSegment = content.charAt(i);

            while(isPunctuation(content.charAt(i+1))) {
                punctuationSegment += content.charAt(i+1);
                i++;
            }

            punctuation = { index: segmentIndex, content: punctuationSegment, type: 'punctuation' };
            segmentSeparators.push(punctuation);
            masterSegmentList.push(punctuation);
            segmentIndex++;
        }
    }

    complete(segments, segmentSeparators, masterSegmentList);
}

function isPunctuation(character) {
    var code = character.charCodeAt(0);

    // [ur'[\u2000-\u206f]', ur'[\u3000-\u303f]', ur'[\u0020-\u00c0]', ur'[\uff00-\uffa0]']
    // 8192 - 8303, 12288 - 12351, 32 - 64, 65280 - 65440
    if (code >= 8192 && code <= 8303) return true;
    if (code >= 12288 && code <= 12351) return true;
    if (code >= 32 && code <= 64) return true;
    if (code >= 65280 && code <= 65440) return true;

    return false;
}



function getAnnotatedSegment(segment, complete) {

    var segmentParseLength = 0;
    var subSegments = [];

    if (segment.type === 'punctuation') {
        return complete([ segment ]);
    }

    var subSegmentCompleteHandler = function(result, originalSegment) {
        segmentParseLength += result.content.length;
        console.log('segementParseLenth: %s, originalSegment: %j', segmentParseLength, originalSegment);

        subSegments.push(result);

        if (segmentParseLength != segment.content.length) {

            var subSegment = JSON.parse(JSON.stringify(segment));
            subSegment.content = segment.content.substr(segmentParseLength, segment.content.length - segmentParseLength);

            console.log('sub-segment parsing not complete, parsing remainder: %j', subSegment);

            getAnnotatedSubSegment(subSegment, subSegmentCompleteHandler);
        } else {
            console.log('subsegment parsing complete..');
            complete(subSegments);
        }

    }

    getAnnotatedSubSegment(segment, subSegmentCompleteHandler);
}

function getAnnotatedSubSegment(subSegment, complete) {

    console.log('getAnnotatedSubSegment: %j', subSegment);

    ceSearch(subSegment, function(resultLookup){
        console.log('resultLookup: %j', resultLookup);

        if (resultLookup.words.length == 0) {

            if (subSegment.content.length == 1) {
                return complete( subSegment, subSegment );
            }

            var shortenedContent = subSegment.content.substr(0, subSegment.content.length-1);

            console.log('~-~-~-: %j', subSegment);

            var shortenedSubSegment = JSON.parse(JSON.stringify(subSegment));
            shortenedSubSegment.content = shortenedContent;

            getAnnotatedSubSegment(shortenedSubSegment, function(result, originalSubSegment) {
                if (typeof result != 'undefined') {
                    return complete(result, originalSubSegment);
                }
            });
        } else {
            return complete(resultLookup, subSegment);
        }
    });

}

function ceSearch(searchSegment, result) {
    var cacheResult = cache.get(searchSegment.content);

    if (typechecker.isEmptyObject(cacheResult)) {

        console.log('(C) MISS');
        ce.searchByChinese(searchSegment.content, function (words) {
            console.log('got results: %j', words);
            searchSegment.words = words;
            searchSegment.hskLevel = 1; // TODO: Get hsk levels into dictionary.

            if (words.length > 0)
                cache.set(searchSegment.content, words);

            hsk.findLevel(searchSegment.content, function(level){
                // level evaluates to -1 if not found, else is in 1..6
                searchSegment.hskLevel = level;
                result(searchSegment);
            });
        });
    } else {
        console.log('(C) HIT');
        searchSegment.words = cacheResult;
        searchSegment.hskLevel = 1; // TODO: Get hsk levels into dictionary.

        result(searchSegment);
    }
}

