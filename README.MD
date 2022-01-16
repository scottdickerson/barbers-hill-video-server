# Video Admin app for Barbers hill

Use this URL to add videos or list them

<http://127.0.0.1:3000/>

## pointing to a mongo database

Set the MONGO_HOSTNAME, MONGO_PORT, MONGO_USER, and MONGO_PASS environment variables to point to the cloud hosted mongo server.

You can set these in the .env file and then source them locally for testing with this
`export $(cat .env | xargs)`

mongodb+srv://admin:<password>@cluster0.umj4z.mongodb.net/myFirstDatabase?retryWrites=true&w=majority

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
heroku create barbers-hill-video-server
git add .
git commit -m 'HEROKU'
git push heroku main
heroku config:set MONGO_HOSTNAME=cluster0.umj4z.mongodb.net
heroku config:set MONGO_USER=admin
heroku config:set MONGO_PASS=<normalpassword>
heroku config:set ENVIRONMENT=heroku

```

You can then hit the server at
https://barbers-hill-video-server.herokuapp.com/

## TODOS

Edit case is writing invalid name since I'm going through the same codepath in formik without file upload

test more than 20 videos to make sure they display from mongo

Add editing of overall page description to main Navigation

Learn to deploy the prebuilt Docker container to Heroku directly
