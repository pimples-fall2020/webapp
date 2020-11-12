function stopTimer(startTime, statsDclient, message){
    endTime = Date.now();
    let timing = endTime - startTime;
    statsDclient.timing(message, timing);
}

module.exports.stopTimer = stopTimer;