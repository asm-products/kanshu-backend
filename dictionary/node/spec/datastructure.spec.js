/**
 * This is a test for storing all of the cc-ce dictionary
 * in a Trie for quick lookup.
 * Created by dsandor on 1/31/15.
 *
 * JS Trie example: http://jsfiddle.net/4Yttq/
 */

var feed = require('feed-read'),
    ce   = require('node-cc-cedict');

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

    parseSegments(articles[0].content);

    console.log('parsed article[0], segments: %s, segmentSeparators: %s', segments.length, segmentSeparators.length);

    console.log('segments: %j', segments);
    console.log('segmentSeparators: %j', segmentSeparators);

    getAnnotatedSegment(segments[3], function(result) {
        console.log('result: %j', result);

        var phrase = '';

        for(var i=0; i < result.length; i++) {
            phrase += result[i].segment;
            if (typeof result[i].words != 'undefined' && result[i].words.length >= 1) {
                phrase += ' (' + result[i].words[0].pronunciation + ') ';
            } else {
                phrase += ' (??) ';
            }
        }

        console.log('phrase: %s', phrase);
    });

    console.log('done.');
});

// Go through the content one char at a time.  Concat a string until hit punctuation or end.
// When hit punctuation or end push this string to an array.
// store punctuation in second array
// take all of the segments in the array and word search length, then length -1 until word is found
// add to word set array for that segment.
// keep parsing next set of chars until all of segment processed.
// start outputting text.  processed words end in punctuation at array element of same index until end.

var segments = [];
var segmentSeparators = [];

// Find segments.  Start at left and copy all chars until hit a punctuation.
// then take all punctuation or space until you hit a non punctuation or space or end.  This is the segment separator for the same index as the segment.

function parseSegments(content) {
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

    ce.searchByChinese(subSegment, function(words){
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

/*
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('../node_modules/node-cc-cedict/db/cc-cedict.sqlite');
var trie = new Trie();

db.serialize(function(){

    db.each('select * from words order by length(traditional) desc;',
        function(err, row) {
            if (!err) {
                trie.put(row.traditional, row);
            }
        },
        function(err, numRows) {
            console.log('numRows: %s', numRows);
        }
    )

});

function Trie(parent, prev, key, value) {
    if (key !== void 0)
        this.key = key;      // single-character key
    if (value !== void 0)
        this.value = value;  // user-defined value
    if (prev)
        prev.next = this;    // next sibling node
    else if (parent)
        parent.child = this; // first child node
}

// put a key/value pair in the trie
Trie.prototype.put = function(name, value) {
    var i = 0, t = this, len = name.length, prev, parent;
    down: while (t.child) {
        parent = t;
        t = t.child;
        // if first child didn't match, get next sibling
        while (t.key != name[i]) {
            if (!t.next) {
                prev = t;
                t = parent;
                break down;
            }
            t = t.next;
        }
        // key already exists, update the value
        if (++i > len) {
            t.value = value;
            return;
        }
    }
    // found any existing parts of the key, add the rest
    t = new this.constructor(t, prev, name[i]);
    while (++i <= len)
        t = new this.constructor(t, null, name[i]);
    t.name = name;
    t.value = value;
};

// get a value from the trie at the given key
Trie.prototype.get = function(name) {
    var i = 0, t = this.child, len = name.length;
    while (t) {
        if (t.key == name[i]) {
            if (i == len)
                return t.value;
            t = t.child;
            ++i;
        } else {
            t = t.next;
        }
    }
};

*/

/*


 var dict = new Trie();

 dict.put("true", "yes");
 dict.put("truck", "vehicle");
 dict.put("trowel", "dig");
 dict.put("hat", "head");
 dict.put("halt", "stop");
 dict.put("ham", "pig");
 dict.put("hammer", "nail");

 dict.put("halt", "hold it");

 console.log("true:", dict.get("true"));
 console.log("truck:", dict.get("truck"));
 console.log("trowel:", dict.get("trowel"));
 console.log("hat:", dict.get("hat"));
 console.log("halt:", dict.get("halt"));
 console.log("ham:", dict.get("ham"));
 console.log("hammer", dict.get("hammer"));


 */