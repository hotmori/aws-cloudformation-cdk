import {SnsAction} from "aws-cdk-lib/aws-cloudwatch-actions";
import {SreMonitoringLambdaDatasourcesComplete} from "../resources/sre-monitoring-lambda-ds-complete";
import { SreMonitoringNotification } from '../resources/sre-monitoring-notification';

export class SreEnvConfig {
    public appInstanceId: string;
    public dbInstanceId: string;
    public envName: string;
    public alarmAction: SnsAction;
    public lambdaDSComplete:SreMonitoringLambdaDatasourcesComplete;
    public notification:SreMonitoringNotification;
    public email_list: string[]
}
