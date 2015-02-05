/**
 * This is a test for storing all of the cc-ce dictionary
 * in a Trie for quick lookup.
 * Created by dsandor on 1/31/15.
 *
 * JS Trie example: http://jsfiddle.net/4Yttq/
 */

var feed        = require('feed-read'),
    ce          = require('node-cc-cedict'),
    async       = require('async'),
    NodeCache   = require('node-cache'),
    typechecker = require('typechecker');

var cache = new NodeCache();
var articleIndex = 0, articleCount = 0;
var stats = [];

feed("http://www.hwjyw.com/rss/zhwh.xml", function(err, articles) {
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
    console.log('articles: %j', articles);

    articleCount = articles.length;

    for(articleIndex=0;articleIndex < articleCount; articleIndex++)
    {
        processArticle(articles[articleIndex], function() {
            console.log('finished processing article.');

            for (var i = 0; i < stats.length; i++) {
                console.log('%j', stats[i]);
            }

        });
    }
});

function processArticle(article, completeProcessArticle) {


    var segmentParserCompleteHander = function(segments, segmentSeparators) {
        var startDate = Date.now();
        console.log('parsed article[%s], segments: %s, segmentSeparators: %s', articleIndex, segments.length, segmentSeparators.length);

        console.log('segments: %j', segments);
        console.log('segmentSeparators: %j', segmentSeparators);

        async.each(segments, function(segment, complete) {
                getAnnotatedSegment(segment, function(result) {

                    var phrase = '';

                    for(var i=0; i < result.length; i++) {
                        phrase += result[i].segment;
                        if (typeof result[i].words != 'undefined' && result[i].words.length >= 1) {
                            phrase += ' (' + result[i].words[0].pronunciation + ') ';
                        } else {
                            phrase += ' (??) ';
                        }
                    }

                    //console.log('phrase: %s', phrase);
                    complete();
                });
            },
            function(err) {

                if (err)
                    console.log('ERROR: %s', err);
                else {
                    var completeDate = Date.now();
                    stats.push( { totalSeconds: (completeDate - startDate) / 1000 })
                    console.log('Complete % seconds', (completeDate - startDate) / 1000 );
                    completeProcessArticle();
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

    for(var i=0; i < content.length; i++)
    {
        if (!isPunctuation(content.charAt(i))) {
            tempSegment += content.charAt(i);
        }
        else
        {
            if (tempSegment.length > 0) {
                segments.push(tempSegment);
                tempSegment = '';
            }

           var punctuationSegment = content.charAt(i);

           while(isPunctuation(content.charAt(i+1))) {
               punctuationSegment += content.charAt(i+1);
               i++;
           }

           segmentSeparators.push(punctuationSegment);
        }
    }

    complete(segments, segmentSeparators);
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

    var subSegmentCompleteHandler = function(result) {
        segmentParseLength += result.segment.length;
        subSegments.push(result);

        if (segmentParseLength != segment.length) {
            getAnnotatedSubSegment(segment.substr(segmentParseLength, segment.length - segmentParseLength), subSegmentCompleteHandler);
        } else {
            complete(subSegments);
        }

    }

    getAnnotatedSubSegment(segment, subSegmentCompleteHandler);
}

function getAnnotatedSubSegment(subSegment, complete) {

    ceSearch(subSegment, function(words){
        if (words.length == 0) {

            if (subSegment.length == 1) {
                return complete( {segment: subSegment} );
            }

            var shortenedSegment = subSegment.substr(0, subSegment.length-1);

            getAnnotatedSubSegment(shortenedSegment, function(result) {
                if (typeof result != 'undefined') {
                    return complete(result);
                }
            });
        } else {
            return complete({ segment: subSegment, words: words });
        }
    });

}

function ceSearch(searchTerm, result) {
    var cacheResult = cache.get(searchTerm);

    if (typechecker.isEmptyObject(cacheResult)) {

        ce.searchByChinese(searchTerm, function (words) {
            result(words);
            cache.set(searchTerm, words);
        });
    } else {
        result(cacheResult);
    }
}
