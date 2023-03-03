import {SnsAction} from "aws-cdk-lib/aws-cloudwatch-actions";
import {InstanceProps} from "aws-cdk-lib/aws-ec2/lib/instance";

export class SreEnvConfig {
    public appInstanceId: string;
    public dbInstanceId: string;
    public envName: string;
    public alarmAction: SnsAction;
    //public instanceProps: InstanceProps;
    public instanceProfileName?: string;
}
