FROM nodesource/node:4

RUN curl -L https://github.com/Yelp/dumb-init/releases/download/v1.1.3/dumb-init_1.1.3_amd64 > /usr/local/bin/dumb-init
RUN chmod +x /usr/local/bin/dumb-init

WORKDIR /usr/src/app
ENV NODE_ENV production

ADD package.json .
RUN npm install

ADD ./ ./

CMD ["dumb-init", "node", "index.js"]
