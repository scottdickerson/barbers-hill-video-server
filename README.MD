# Video Admin app for Barbers hill

Use this URL to add videos or list them

<http://127.0.0.1:3000/>

## pointing to a mongo database

Set the MONGO_HOSTNAME and MONGO_PORT environment variables to point to a different mongo than the local one

## Deploying to Heroku

Make sure the two environment variables MONGO_HOSTNAME and MONGO_PORT are set on that heroku project. By default it's 127.0.0.1 and 27017 respectively

Deploy to Heroku for testing

## TODOS

Edit case is writing invalid name since I'm going through the same codepath in formik without file upload

test more than 20 videos to make sure they display from mongo

Add editing of overall page description to main Navigation
