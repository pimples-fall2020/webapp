#!/bin/bash
# cd /tmp/

# curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
# sudo apt-get install -y nodejs
# sudo apt-get install -y build-essential

# npm install -g pm2
cd /home/ubuntu/webapp
sudo npm i --unsafe-perm=true --allow-root
#This is for the changing the permision

# # Delete already existing file
# if [-f "./cloudwatch-config.json"]; then
# rm -rf ./cloudwatch-config.json
# fi

$FILE=./cloudwatch-config.json

sudo chmod +x cloudwatch-config.json
