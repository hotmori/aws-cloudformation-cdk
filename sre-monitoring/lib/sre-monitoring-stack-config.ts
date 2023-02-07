import {IVpc, SecurityGroup} from "aws-cdk-lib/aws-ec2";
import {CfnInstanceProfile, Role} from "aws-cdk-lib/aws-iam";
import {SreAlarmActions} from "./sre-alarm-actions";

export class SreMonitoringStackConfig {

    public constructor(public prefix: string,
                       public vpc: IVpc,
                       public instanceProfile: CfnInstanceProfile,
                       public role: Role,
                       public securityGroup: SecurityGroup,
                       public alarmAction: SreAlarmActions) {
    }
}
