import {SnsAction} from "aws-cdk-lib/aws-cloudwatch-actions";
import {SreMonitoringLambdaDatasourcesComplete} from "../resources/sre-monitoring-lambda-ds-complete";

export class SreEnvConfig {
    public appInstanceId: string;
    public dbInstanceId: string;
    public envName: string;
    public alarmAction: SnsAction;
    public lambda:SreMonitoringLambdaDatasourcesComplete;
    public instanceProfileName?: string;
}
