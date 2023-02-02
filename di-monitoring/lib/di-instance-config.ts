import {SnsAction} from "aws-cdk-lib/aws-cloudwatch-actions";
import {InstanceProps} from "aws-cdk-lib/aws-ec2/lib/instance";

export class DiInstanceConfig {
    public instanceId?: string;
    public alarmAction: SnsAction;
    public instanceProps: InstanceProps;

    public instanceProfileName?: string;
}
