var feed        = require('feed-read'),
    data        = require('./data.pg.js'),
    async       = require('async'),
    NodeCache   = require('node-cache'),
    typechecker = require('typechecker'),
    hsk         = require('hsk-words');

var wordCache = new NodeCache();  // used to cache up the words discovered in the dictionary.
var missCache = new NodeCache();  // used to cache the words that were not found in the dictionary.

var log = {};

module.exports = {
    /**
     * Looks up a single word.
     */
    lookup: internalLookup,

    /**
     * Processes an RSS feed article.  Expects a JSON post like:
     * { "url": "http://www.hwjyw.com/rss/zhwh.xml", "articleIndex": 4 }
     */
    processFeed: internalProcessFeed,

    /**
     * This method will precache the cc-cedict into memory.
     */
    precacheDictionary: internalPrecacheDictionary,

    /**
     * Sets the logger to use.
     * @param value
     */
    setLogger: function(value) { log = value; data.setLogger(value); },

    /**
     * Sets the connection string for the data layer.
     * @param value
     */
    setConnectionString: function(value) { data.setConnectionString(value); }

};

/**
 * This function is used to precache the cc-cedict node module dictionary into memory.
 */
function internalPrecacheDictionary() {
    console.log('precaching cc-cedict.');

    var errorHandler = function(err) {
        log.error('failed getting words from data layer', err);
    };

    var completeHandler = function(words) {
        console.log('got all words: %s', words.length);

        var collapsedList = [];
        var collapsedListIndex = 0;

        console.log('collapsing dupe words..');

        for(var i=0; i < words.length; i++) {
            if (i == 0) {
                collapsedList[0] = words[i];
            } else {
                if (words[i].traditional == collapsedList[collapsedListIndex].traditional) {
                    collapsedList[collapsedListIndex].definitions.push(words[i].definitions[0]);
                    continue;
                } else {
                    collapsedListIndex++;
                    collapsedList[collapsedListIndex] = words[i];
                }
            }
        }

        // add the collapsed list to the cache.
        console.log('adding collapsed list [%s] to cache.', collapsedListIndex)
        for(var i=0; i < collapsedListIndex; i++) {
            wordCache.set(collapsedList[i].traditional, collapsedList[i]);

            if (collapsedList[i].traditional != collapsedList[i].simplified)
                wordCache.set(collapsedList[i].simplified, collapsedList[i]);
        }

        console.log('cached all words');
    };

    data.getEntireDictionary(errorHandler, 'en', completeHandler);
}

/**
 * Performs simple lookup of a word.
 * @param req - the http request object.
 * @param res - the http response object.
 * @param next - callback to call when processing complete.
 */
function internalLookup(req, res, next) {
    ceSearchCacheOnly({ content: req.params.phrase }, function(words) {
        res.send(200, { words: words });
        return next();
    });
}

/**
 * Internal function that handles the process feed request.
 * @param req - the http request object.
 * @param res - the http response object.
 * @param next - callback to call when processing complete.
 */
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

/**
 * This method will take a RSS article and process the entire content section.
 * @param article - The article object to process.
 * @param completeProcessArticle - callback which is called upon completion.
 */
function processArticle(article, completeProcessArticle) {

    var segmentParserCompleteHander = function(segments, segmentSeparators, masterList) {

        var annotatedArticle = [];
        var currentMasterListIndex = 0;

        async.eachSeries(masterList, function(segment, complete) {

                console.log('currentMasterListIndex: %s', currentMasterListIndex);

                getAnnotatedSegment(segment, function(result) {

                    for(var i =0; i < result.length; i++) {
                        annotatedArticle.push(result[i]);
                    }
                    currentMasterListIndex++;
                    complete();
                });
            },
            function(err) {

                if (err)
                    console.log('ERROR: %s', err);
                else {
                    mergeEolPunctuation(annotatedArticle, function(results) {
                        completeProcessArticle(results);
                    });
                }
            });
    };

    parseSegments(article.content, segmentParserCompleteHander);
}

function mergeEolPunctuation(articleArray, complete) {
    var mergedArray = [];

    for(var i = 0; i < articleArray.length; i++) {
        if (i > 0 && articleArray[i].type === 'punctuation') {
            if (isEolPunctuation(articleArray[i].content.charAt(0))) {
                mergedArray[mergedArray.length-1].displayText += articleArray[i].content.charAt(0);

                if (articleArray[i].content.length > 1) {
                    articleArray[i].content = articleArray[i].content.substr(1);
                    mergedArray.push(articleArray[i]);
                } else {
                    continue;
                }
            } else {
                mergedArray.push(articleArray[i]);
            }
        } else {
            mergedArray.push(articleArray[i]);
        }
    }

    complete(mergedArray);
}

/**
 * Examines the content string and separates the text into segments split by punctuation characters.
 * @param content - The content to parse.
 * @param complete - The callback to call when complete.
 */
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
                wordSegment = { index: segmentIndex, content: tempSegment, type: 'word', displayText: tempSegment };

                /*if (isEolPunctuation(content.charAt(i))) {
                 wordSegment.displayText += content.charAt(i);
                 i++;
                 }*/

                segments.push(wordSegment);
                masterSegmentList.push(wordSegment);
                segmentIndex++;
                tempSegment = '';
                //continue;
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

/**
 * Determines if the character is a punctuation character.
 * @param character - the character to test.
 * @returns {boolean}
 */
function isPunctuation(character) {
    var code = character.charCodeAt(0);

    if (code >= 8192 && code <= 8303) return true;
    if (code >= 12288 && code <= 12351) return true;
    if (code >= 32 && code <= 64) return true;
    if (code >= 65280 && code <= 65440) return true;

    return false;
}

/**
 * Determines of the character is one that must be on the end of a line but never at the start.
 * @param character - The character to check.
 * @returns {boolean}
 */
function isEolPunctuation(character) {

    var eolChars = ')]｝〕〉》」』】〙〗〟’”｠»。. ?!‼⁇⁈⁉・、:;,‐゠–〜';

    return (eolChars.indexOf(character) >=0);
}

/**
 * Looks at a string of characters and finds all the distinct words taking the largest word first.
 * @param segment - the segment of characters to examine.
 * @param complete - callback
 * @returns {*}
 */
function getAnnotatedSegment(segment, complete) {

    var segmentParseLength = 0;
    var subSegments = [];

    if (segment.type === 'punctuation') {
        return complete([ segment ]);
    }

    var subSegmentCompleteHandler = function(result, originalSegment) {
        segmentParseLength += result.content.length;
        console.log('segementParseLenth: %s\noriginalSegment: %j\nresult: %j', segmentParseLength, originalSegment, result);

        subSegments.push(result);

        if (segmentParseLength < segment.content.length) {

            var subSegment = JSON.parse(JSON.stringify(segment));
            subSegment.content = segment.content.substr(segmentParseLength, segment.content.length - segmentParseLength);
            subSegment.displayText = subSegment.content;

            console.log('sub-segment parsing not complete [segmentParseLength=%s], [segment.content.length=%s], parsing remainder: %j',
                segmentParseLength, segment.content.length, subSegment);

            getAnnotatedSubSegment(subSegment, subSegmentCompleteHandler);
        } else {
            console.log('subsegment parsing complete..');
            complete(subSegments);
        }

    }

    getAnnotatedSubSegment(segment, subSegmentCompleteHandler);
}

/**
 * Recursively finds sub words in the segment.
 * @param subSegment - A segment to find words in.
 * @param complete - callback.
 */
function getAnnotatedSubSegment(subSegment, complete) {

    console.log('getAnnotatedSubSegment: %j', subSegment);

    ceSearchCacheOnly(subSegment, function(resultLookup){
        console.log('resultLookup: %j', resultLookup);

        if (resultLookup.definitions.length == 0) {

            if (subSegment.content.length == 1) {
                return complete( subSegment, subSegment );
            }

            var shortenedContent = subSegment.content.substr(0, subSegment.content.length-1);

            var shortenedSubSegment = JSON.parse(JSON.stringify(subSegment));
            shortenedSubSegment.content = shortenedContent;
            shortenedSubSegment.displayText = shortenedContent;

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

/**
 * Search for the segment in the dictionary.  This function uses cc-cedict node module and uses caching.
 * @param searchSegment - the text to search for.
 * @param result - the results of the search.
 * @returns {*}
 *
function ceSearch(searchSegment, result) {

    // first try the miss cache.
    var missCacheResult = missCache.get(searchSegment.content);

    if (!typechecker.isEmptyObject(missCacheResult)) { // This segment is already known to not be a word in the dictionary.
        searchSegment.definitions = [];
        searchSegment.hskLevel = -1;

        return result(searchSegment);
    }

    var cacheResult = wordCache.get(searchSegment.content);



    if (typechecker.isEmptyObject(cacheResult)) {

        console.log('(C) MISS');
        ce.searchByChinese(searchSegment.content, function (words) {
            console.log('got results: %j', words);
            searchSegment.definitions = words;
            searchSegment.hskLevel = 1; // TODO: Get hsk levels into dictionary.

            if (words.length > 0)
                wordCache.set(searchSegment.content, words);
            else
                missCache.set(searchSegment.content, true);

            hsk.findLevel(searchSegment.content, function(level){
                // level evaluates to -1 if not found, else is in 1..6
                searchSegment.hskLevel = level;
                result(searchSegment);
            });
        });
    } else {
        console.log('(C) HIT');
        searchSegment.definitions = cacheResult;

        hsk.findLevel(searchSegment.content, function(level){
            // level evaluates to -1 if not found, else is in 1..6
            searchSegment.hskLevel = level;
            result(searchSegment);
        });
    }
}*/

/**
 * Search for the segment in the in memory cache.
 * @param searchSegment - the text to search for.
 * @param result - the results.
 * @returns {*}
 */
function ceSearchCacheOnly(searchSegment, result) {

    var cacheResult = wordCache.get(searchSegment.content)[searchSegment.content];

    if (typechecker.isEmptyObject(cacheResult)) {

        searchSegment.definitions = [];
        searchSegment.hskLevel = -1;

        return result(searchSegment);

    } else {
        hsk.findLevel(searchSegment.content, function(level){
            // level evaluates to -1 if not found, else is in 1..6
            searchSegment.definitions = cacheResult.definitions;
            searchSegment.pronunciation = cacheResult.pronunciation;
            searchSegment.hskLevel = level;
            result(searchSegment);
        });
    }
}