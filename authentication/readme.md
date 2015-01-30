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




[node.js]:http://nodejs.org
[createuser]:https://raw.githubusercontent.com/dsandor/kanshu-backend/master/authentication/docs/screenshots/CreateUser.png "Create User"
[updateuser]:https://raw.githubusercontent.com/dsandor/kanshu-backend/master/authentication/docs/screenshots/UpdateUser.png "Update User"
[login]:https://raw.githubusercontent.com/dsandor/kanshu-backend/master/authentication/docs/screenshots/Login.png "Login User"
[logout]:https://raw.githubusercontent.com/dsandor/kanshu-backend/master/authentication/docs/screenshots/Logout.png "Logout User"