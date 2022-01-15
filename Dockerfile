FROM node:17

WORKDIR /usr/app
COPY ./ /usr/app
RUN npm install

# Set up a default command
CMD [ "npm","start" ]