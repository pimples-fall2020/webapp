#!/bin/bash
cd /home/ubuntu/webapp
# set any env variables
# export NODE_ENV=staging

# npm run start
sudo kill -9 $(sudo lsof -t -i:8080);
sudo nohup npm start > /dev/null 2> /dev/null < /dev/null &