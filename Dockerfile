FROM node:14-alpine
ENV NPM_CONFIG_CACHE=/tmp/npm-cache
WORKDIR /api
COPY package.json .
RUN npm install
COPY . .
RUN npm install nodemon
# RUN npm install cross-env -g
# RUN npm install pm2 -g
# RUN npm run start
EXPOSE 5000
CMD [ "npm" , "run" , "dev" ]