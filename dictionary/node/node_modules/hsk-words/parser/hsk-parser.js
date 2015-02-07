// I used this script to generate ../db/cc-cedict.sqlite
// CC-CEDICT version as of October 6, 2014
// see ../src/cc-cedict.txt for more details

var Sequelize = require('sequelize');
var sqlite = require('sqlite3');
var fs = require('fs');

// defined db config
var sequelize = new Sequelize(null, null, null, {
  dialect: 'sqlite',
  storage: '../db/hsk-words.sqlite'
});

// create a sqlite database with every entry 
var Word = sequelize.define('Word', {
  level: Sequelize.INTEGER,
  simplified: Sequelize.STRING,
  pronunciation: Sequelize.STRING,
  definitions: Sequelize.STRING
});

// sync up the schema
sequelize
  .sync({ force: true })
  .complete(function(err) {
     if (!!err) {
       console.log('An error occurred while creating the table:', err);
     } else {
       console.log('It worked!');
     }
  });

// excel-parse has 2 other dependencies in python
// don't run this in deployment (use generated .sqlite)
// but for reference you would need to run:
//   $ pip install argparse
//   $ pip install xlrd

var excelParser = require('excel-parser');

excelParser.parse({
  inFile: '../src/New_HSK_words.xls',
  worksheet: 1
}, function(err, results){
  if (err) console.error(err);
  results.forEach(function(row){
    Word.create({
      level: parseInt(row[0]),
      simplified: row[1],
      pronunciation: row[2],
      definitions: row[3]
    });
  });
});



