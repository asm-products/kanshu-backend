#kanshu dictionary api

The dictionary api is written in JavaScript and runs on [node.js].

Start the service with the following command:
```sh
$ node index.js
```
This will output a log line like the following:
```sh
{"name":"api","hostname":"macmini.devsql.local","pid":9397,"level":30,"msg":"restify listening at http://0.0.0.0:23001","time":"2015-01-29T02:22:30.387Z","v":0}
```
You may wish to edit some configuration settings in the ```config.json``` file, it looks like this:
```sh
{
  "connectionString": "postgres://localhost/kanshu",
  "apiServicePort": 8080
}
```
Hopefully these settings are fairly self explanitory.

###Configuring the PG database
The table structure is defined in [dictionary/node/sql/words_create_script.sql](https://raw.githubusercontent.com/dsandor/kanshu-backend/master/dictionary/node/sql/words_create_script.sql)

```sh
create table words (
	translatedto varchar(8) NOT NULL,
	traditional varchar(255) NOT NULL,
	simplified varchar(255) NOT NULL,
	pronunciation varchar(255),
	definition varchar(512),
	PRIMARY KEY ( translatedto, traditional, simplified, definition )
	);
```
A script to insert all of the words is in the [cc-cddict.sql.zip](https://raw.githubusercontent.com/dsandor/kanshu-backend/master/dictionary/node/sql/cc-cedict.sql.zip) file.  This will seed the PG database with 110144 words.  The service loads all of these words into an in memory cache at startup for performance.

##/processFeed
This is an http `POST` request.

```sh
{
    "url": "http://www.hwjyw.com/rss/zhwh.xml",
    "articleIndex": 0
}
```

This call will load the RSS feed specified in the `url` property and will attempt to process the article at the `articleIndex` ordinal (zero based).

![alt text][processFeed]

##/lookup
This is an http `GET` request in the format: /lookup/[word]
For example:
```sh
http://localhost:23001/lookup/你好
```

![alt text][lookup]


[node.js]:http://nodejs.org
[processFeed]:https://raw.githubusercontent.com/dsandor/kanshu-backend/master/dictionary/docs/screenshots/processFeed.png "Process Feed"
[lookup]:https://raw.githubusercontent.com/dsandor/kanshu-backend/master/dictionary/docs/screenshots/lookup.png "Lookup"