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
