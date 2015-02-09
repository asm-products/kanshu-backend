var assert = require('assert');
var hsk = require('../index');

describe('Search HSK list', function(){

  describe('findLevel() method', function(){
    
    it('should find the correct levels for words', function(done){
      hsk.findLevel('世界', function(level){
        assert.equal(level, 3);
        done();
      });
    });

    it('should return -1 for words not in the list', function(done){
      hsk.findLevel('你好', function(level){
        assert.equal(level, -1);
        done();
      });
    });

  });

});