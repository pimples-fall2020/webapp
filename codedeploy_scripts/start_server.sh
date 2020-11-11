#!/bin/bash
cd /home/ubuntu/webapp
# set any env variables
# export NODE_ENV=staging

sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
-a fetch-config \
-m ec2 \
-c file:./cloudwatch-config.json \
-s

# npm run start
sudo kill -9 $(sudo lsof -t -i:8080);
sudo nohup npm start > /dev/null 2> /dev/null < /dev/null &