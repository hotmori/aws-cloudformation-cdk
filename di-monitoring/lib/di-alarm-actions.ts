import {SnsAction} from "aws-cdk-lib/aws-cloudwatch-actions";

export class DiAlarmActions {
    dev: SnsAction;
    prod: SnsAction;
}
