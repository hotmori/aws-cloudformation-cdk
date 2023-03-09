import {Code, Function, Runtime} from "aws-cdk-lib/aws-lambda";
import {Construct} from "constructs";
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import {Effect, PolicyStatement} from "aws-cdk-lib/aws-iam";

import path from "path";

export class SreMonitoringLambdaDatasourcesComplete {
    readonly lambdaFunction: Function;

    public constructor(scope: Construct,
                       public prefix:string
                       ) {
        const policyStatement = new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['cloudwatch:PutMetricData'],
            resources: ['*']
        });

        const lambdaFunctionName:string = `${prefix}_MonitoringLambdaDatasourcesComplete`;
        const lambdaCode = Code.fromAsset(path.join(__dirname,'../../src_lambda/'));

        this.lambdaFunction = new Function(scope,
            lambdaFunctionName,
            {code: lambdaCode,
                   handler: 'lambda-datasource-complete.handler',
                   runtime: Runtime.NODEJS_16_X,
                   functionName: lambdaFunctionName,
                   logRetention: RetentionDays.TWO_MONTHS,
                   environment:{NAMESPACE:`${prefix}_Metrics`},
                   initialPolicy: [policyStatement]
                 });
    }
}