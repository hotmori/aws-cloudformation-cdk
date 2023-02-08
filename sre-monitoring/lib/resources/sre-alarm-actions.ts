import {SnsAction} from "aws-cdk-lib/aws-cloudwatch-actions";

export class SreAlarmActions {
    dev: SnsAction;
    prod: SnsAction;
}
