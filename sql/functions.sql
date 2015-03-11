 CREATE OR REPLACE FUNCTION linkArticleToUser (
     articleIdValue integer,
     userIdValue integer
 ) RETURNS void AS $$
     DECLARE
       cnt INTEGER;
 BEGIN
   select into cnt count(0) from userarticle where userarticle.articleid = articleIdValue AND userarticle.userid = userIdValue;

       if (cnt < 1) THEN
          insert into userarticle (userid, articleid, dateread) VALUES (userIdValue, articleIdValue, now());
       END if;

 END;
$$ LANGUAGE plpgsql;