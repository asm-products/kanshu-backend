create table words (
	translatedto varchar(8) NOT NULL,
	traditional varchar(255) NOT NULL,
	simplified varchar(255) NOT NULL,
	pronunciation varchar(255),
	definition varchar(512),
	PRIMARY KEY ( translatedto, traditional, simplified, definition )
	);