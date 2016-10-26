FROM nodesource/node:4

RUN curl -L https://github.com/Yelp/dumb-init/releases/download/v1.1.3/dumb-init_1.1.3_amd64 > /usr/local/bin/dumb-init
RUN chmod +x /usr/local/bin/dumb-init

WORKDIR /usr/src/app

ADD package.json .
ENV NODE_ENV dev
RUN npm install


RUN npm install -g local-web-server
ADD ./ ./

ENV LOG_LEVEL none

CMD ["dumb-init", "npm", "test"]
