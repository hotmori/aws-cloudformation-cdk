import {Construct} from "constructs";
import {LogGroup, LogStream, RetentionDays} from "aws-cdk-lib/aws-logs";
import {RemovalPolicy} from "aws-cdk-lib";

export class SreMonitoringLogGroup {
    readonly logGroup: LogGroup;
    readonly logStream: LogStream;
    public constructor(scope: Construct,
                       public prefix:string,
                       public instanceId:string,
                       public streamName:string) {

         const logGroupName:string = `${prefix}_${instanceId}_${streamName}.log`;
         const logStreamName:string = `${prefix}_${streamName}.log`;

         this.logGroup = new LogGroup(
            scope,
            `${logGroupName}`,
            {
                logGroupName:`${logGroupName}`,
                retention: RetentionDays.ONE_MONTH,
                removalPolicy:RemovalPolicy.RETAIN
            }
        )

        this.logStream = this.logGroup.addStream(`${logStreamName}`,
                                               {logStreamName: `${logStreamName}`});

    }
}