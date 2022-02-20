# Video Admin app for Barbers hill

Use this URL to add videos or list them

<http://127.0.0.1:3000/>

## pointing to a mongo database

Set the MONGO_HOSTNAME, MONGO_PORT, MONGO_USER, and MONGO_PASS environment variables to point to the cloud hosted mongo server.

On Mac OS you can set these in the .env file and then source them locally for testing with this
`export $(cat .env | xargs)`

Otherwise run each of these separately
```
 export MONGO_HOSTNAME=cluster0.umj4z.mongodb.net
 export MONGO_USER=admin
 export MONGO_PASS=<normalpassword>
```


## Running a local docker image

We have a composed docker image that will start the local mongo database and UI server at the same time but it's not currently persisting files between restart. TODO!
Run locally with

```~~~bash
docker compose build
docker compose up
```

## Deploying to Heroku

In our Heroku environment we're pointing to our mongo database in atlas:
<https://www.mongodb.com/developer/how-to/use-atlas-on-heroku/>

Make sure the two environment variables MONGO_HOSTNAME and MONGO_PORT are set on that heroku project. By default it's 127.0.0.1 and 27017 respectively

Deploy to Heroku for testing

```~~~bash
heroku login
heroku git:remote -a barbers-hill-video-server
git add .
git commit -m 'HEROKU'
git push heroku main
heroku config:set MONGO_HOSTNAME=cluster0.umj4z.mongodb.net
heroku config:set MONGO_USER=admin
heroku config:set MONGO_PASS=<normalpassword>

```

You can then hit the server at
https://barbers-hill-video-server.herokuapp.com/

## Bring the remote database locally for actual production performance testing

Install mongodb database tools:
`https://docs.mongodb.com/database-tools/installation/installation-macos/`

Dump the remote db: https://docs.mongodb.com/database-tools/mongodump/

```
mongodump --uri=<url from the server console when starting pointing to remote db>
```

Delete the local db

Restore to local db: https://docs.mongodb.com/database-tools/mongorestore/

```
mongorestore

```

## TODOS

test more than 20 videos to make sure they display from mongo
Add uploading message while video is uploading
