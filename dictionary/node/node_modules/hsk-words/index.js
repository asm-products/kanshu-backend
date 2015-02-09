var _ = require('underscore');
var path = require('path');
var Sequelize = require('sequelize');
var sequelize = new Sequelize(null, null, null, {
  dialect: 'sqlite',
  storage: path.join(__dirname, './db/hsk-words.sqlite')
});

var Word = sequelize.define('Word', {
  level: Sequelize.INTEGER,
  simplified: Sequelize.STRING,
  pronunciation: Sequelize.STRING,
  definitions: Sequelize.STRING
});

// convert between traditional and simplified
var cnchars = require('cn-chars');

module.exports.findLevel = function(word, cb){
  // handle traditional characters
  var simplified = word.slice().split('');
  for (var i = 0; i < word.length; i++){
    simplified[i] = cnchars.toSimplifiedChar(word[i]);
  }
  simplified = simplified.join('');

  var query = {
    where: {simplified: simplified}
  };

  Word
    .findOne(query)
    .success(function(word){
      cb(word.level);
    })
    .error(function(){
      cb(-1);
    });
};



