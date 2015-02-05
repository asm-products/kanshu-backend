var feed        = require('feed-read'),
    ce          = require('node-cc-cedict'),
    async       = require('async'),
    NodeCache   = require('node-cache'),
    typechecker = require('typechecker'),
    cedict      = require('node-cc-cedict');

var cache = new NodeCache();
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
// TODO: Finish this off so that we can take an RSS feed url and process all the articles.
function internalProcessArticle(req, res, next) {

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
        console.log('articles: %j', articles);

        var startDate = Date.now();

        parseSegments(articles[0].content);

        console.log('parsed article[0], segments: %s, segmentSeparators: %s', segments.length, segmentSeparators.length);

        console.log('segments: %j', segments);
        console.log('segmentSeparators: %j', segmentSeparators);

        async.each(segments, function(segment, complete) {
                getAnnotatedSegment(segment, function(result) {
                    //console.log('result: %j', result);

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
                    console.log('Complete % seconds', (completeDate - startDate) / 1000 );
                }
            });


        console.log('done.');
    });
}

/**
 * Parses the content into segments and punctuation segments.
 * @param content - the content to be parsed.
 * @param complete - a callback that passes back segments and segmentSeparators
 */
function parseSegments(content, complete) {
    var segments = [];
    var segmentSeparators = [];
    var tempSegment = '';

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