FROM nodesource/node:4

RUN npm install -g local-web-server
WORKDIR /usr/src/app
EXPOSE 8000

CMD ["ws"]
