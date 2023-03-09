const AWS = require('aws-sdk');
const cloudwatch = new AWS.CloudWatch({ apiVersion: '2010-08-01' });

var zlib = require('zlib');

exports.handler = function(input, context) {
    var payload = Buffer.from(input.awslogs.data, 'base64');
    zlib.gunzip(payload, async function(e, result) {
        if (e) {
            context.fail(e);
        } else {
            const obj = JSON.parse(result.toString());
            console.log(obj);
            
             
            const logGroupName = obj.logGroup;
            console.log(`log group name: ${logGroupName}`);
            const regexpLogGroup = /(SRE)_(.*)_(.*)/;
            const matchLogGroup = logGroupName.match(regexpLogGroup);
            const prefix = matchLogGroup[1];
            const instanceID = matchLogGroup[2];
            const logStreamName = matchLogGroup[3];

            const namespace = process.env.NAMESPACE;
            const metricname = `${prefix}_${instanceID}_DatasourcesCompleteTime`;

            console.log(`metric namespace: ${namespace}`);
            console.log(`metric name: ${metricname}`);


            let params = {
                MetricData: [],
                Namespace: namespace
            }            
            const regexpCompleteTime = /Datasources - complete in (.*)(ms)/;      
            const logEvents = obj.logEvents;      
            for (var i = 0; i < logEvents.length; i++) {
                const msg = logEvents[i].message;

                console.log("Message: " + i + ": " + logEvents[i].message);
                const matchCompleteTime = msg.match(regexpCompleteTime);
                const completeTimeSeconds = matchCompleteTime[1]/1000; 
                console.log(`Complete Time seconds: ${completeTimeSeconds}`);

                params.MetricData.push({
                    'MetricName': metricname,
                    'Unit': 'Seconds',
                    'Value': completeTimeSeconds
                });

                const result = await cloudwatch.putMetricData(params, function(err, data) {
                    if (err) {
                      console.log("putMetricData Error", err);
                      context.fail();
                    } else {
                      console.log("putMetricData Success", JSON.stringify(data));
                      context.succeed();
                    }
                    console.log('Finished');
                  });
            }          
        }
    });
};