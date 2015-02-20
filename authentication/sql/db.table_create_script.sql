/* Create the users table. */
CREATE TABLE users (
	id						 serial,
	email				  	 varchar(120),
	passwordhash		  	 varchar(384),
	lastlogin	 		  	 timestamp,
	sessionid			  	 varchar(40),
	sessionexpirationdate 	 timestamp,
	salt					 varchar(40),
	userBio					 varchar(150),
	country					 varchar(150),
	UNIQUE(email)
	);