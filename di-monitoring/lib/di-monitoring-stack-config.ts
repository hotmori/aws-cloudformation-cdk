import {IVpc, SecurityGroup, Vpc} from "aws-cdk-lib/aws-ec2";
import {CfnInstanceProfile, Role} from "aws-cdk-lib/aws-iam";
import {SnsAction} from "aws-cdk-lib/aws-cloudwatch-actions";
import {DiAlarmActions} from "./di-alarm-actions";

export class DiMonitoringStackConfig {

    public constructor(public prefix: string,
                       public vpc: IVpc,
                       public instanceProfile: CfnInstanceProfile,
                       public role: Role,
                       public securityGroup: SecurityGroup,
                       public alarmActions: DiAlarmActions) {
    }
}
