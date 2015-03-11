# kanshu user-metrics api
The user-metrics api provides methods to allow the saving and retreival of user metric data.  All of the methods in this API excpect a `sessionid` HTTP header to authenticate the user.

### `POST` /saveword
This method saves the word to the user's word list.  Provide the `wordId` in a JSON object.
```sh
{ wordId: 1 }
```
An HTTP 200 status will be returned if the save is successful.

### `POST` /deleteword
This method deletes a word from the user's word list.
```sh
{ wordId: 1 }
```
An HTTP 200 status will be returned if the delete is successful.

### `POST` /linkarticle
This method will link an article to a user.
```sh
{ articleId: 1 }
```
An HTTP 200 status will be returned if the link is successful.

### `POST` /markmastered
This method will mark a word in the user's list as mastered.
```sh
{ wordId: 1 }
```
An HTTP 200 status will be returned if the update is successful.

### `GET` /getwords
This method gets a list of the words that the user has *saved*.
```sh
[{
    "id": Integer,
    "translatedto": String,
    "traditional": String,
    "simplified": String,
    "pronunciation": String,
    "hsklevel": Integer,
    "definitions": [],
    "ismastered": Boolean,
    "mastereddate": Date,
    "saveddate": Date
}]
```

### `GET` /getwordsmastered
This method returns back counts of mastered vs. unmastered words in the user's saved words list.
```sh
{
    "mastered": Integer,
    "unmastered": Integer
}
```

### `GET` /getmasteredbylevel
This method gets the word counts by level that the user has mastered.
```sh
{
    "level0": Integer,
    "level1": Integer,
    "level2": Integer,
    "level3": Integer,
    "level4": Integer,
    "level5": Integer,
    "level6": Integer
}
```
* Please note that **level0** represents words that are mastered but are not listed in the HSK level lists.

### `GET` /getarticlesreadmetric
This method gets the article counts for the user identified by the sessionId passed in the header.
```sh
{
    "articleCount": Integer
}
```


# kanshu dictionary api

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

### Configuring the PG database
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

## /processFeed
This is an http `POST` request.

```sh
{
    "url": "http://www.hwjyw.com/rss/zhwh.xml",
    "articleIndex": 0
}
```

This call will load the RSS feed specified in the `url` property and will attempt to process the article at the `articleIndex` ordinal (zero based).

![alt text][processFeed]

## /lookup
This is an http `GET` request in the format: /lookup/[word]
For example:
```sh
http://localhost:23001/lookup/你好
```

![alt text][lookup]

## /article
This is an http `GET` request in the format: /lookup/[articleId]
For example:
```sh
http://localhost:23001/article/1
```
Returns an article object. [https://gist.github.com/dsandor/b58690b726d5ff792aa5]

## /articles
This is an http `GET` request in the format: /articles/[articleSourceId]/[maxRecords] *maxRecords* is optional and if not supplied will return all articles for the articleSourceId.

The following example returns the 10 most recent articles for the articleSourceId of 1.
```sh
http://localhost:23001/articles/1/10
```
Returns an array of article objects. [https://gist.github.com/dsandor/077a427e6ef516d74ac1]

#kanshu authentication api

The authentication api is written in JavaScript and runs on [node.js].

Start the service with the following command:
```sh
$ node index.js
```
This will output a log line like the following:
```sh
{"name":"api","hostname":"macmini.devsql.local","pid":9397,"level":30,"msg":"restify listening at http://0.0.0.0:8080","time":"2015-01-29T02:22:30.387Z","v":0}
```
You may wish to edit some configuration settings in the ```config.json``` file, it looks like this:
```sh
{
  "connectionString": "postgres://localhost/kanshu",
  "initialSessionExpirationMinutes": 10080,
  "apiServicePort": 8080
}
```
Hopefully these settings are fairly self explanitory.

##/createUser
This is an http `POST` request and requires no sessionid or authentication in order to be called.

>The service will return an HTTP 200 status indicating the user is created.  Otherwise an error will be reported as an HTTP 500 status and a JSON error object will be sent in the body of the response. `{ message: 'some error message text' }`

![alt text][createuser]

##/login
This is an http `GET` request and must authenticate to the api with basic http authentication. Here are links to accomplish this:
* iOS / Swift http://stackoverflow.com/a/24380884
* Android http://stackoverflow.com/a/8920939

>The service will return an HTTP 200 status and the body of the response will contain the sessionid.
```{"sessionId":"362d0bae-0fc7-460d-b79a-98c64a4382c3"}```

![alt text][login]

##/updateUser
This is an http `POST` request.  In order to perform this request a `sessionid` header must exist with a valid session id value that corresponds to the email address in the posted data.  The call expects a JSON formatted body to contain an object like the following:
```
 {
    "password": "abc123",
    "email": "pg.data.unittest@test.com",
    "userBio": "some interesting text about the user.",
    "country": "France"
 }
 ```
 ![alt text][updateuser]

 ##/logout
 This is a http `GET` request.  The call expects a `sessionid` header with the session id of the user you want logged out.  The call will return an HTTP 200 response if successful.

 ![alt text][logout]


[processFeed]:https://raw.githubusercontent.com/dsandor/kanshu-backend/master/dictionary/docs/screenshots/processFeed.png "Process Feed"
[lookup]:https://raw.githubusercontent.com/dsandor/kanshu-backend/master/dictionary/docs/screenshots/lookup.png "Lookup"
[node.js]:http://nodejs.org
[createuser]:https://raw.githubusercontent.com/dsandor/kanshu-backend/master/authentication/docs/screenshots/CreateUser.png "Create User"
[updateuser]:https://raw.githubusercontent.com/dsandor/kanshu-backend/master/authentication/docs/screenshots/UpdateUser.png "Update User"
[login]:https://raw.githubusercontent.com/dsandor/kanshu-backend/master/authentication/docs/screenshots/Login.png "Login User"
[logout]:https://raw.githubusercontent.com/dsandor/kanshu-backend/master/authentication/docs/screenshots/Logout.png "Logout User"