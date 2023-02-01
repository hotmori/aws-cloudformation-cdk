import {SnsAction} from "aws-cdk-lib/aws-cloudwatch-actions";

export class DiInstanceConfig {
    public instanceName: string;
    public instanceId: string;
    public alarmAction: SnsAction;
}
