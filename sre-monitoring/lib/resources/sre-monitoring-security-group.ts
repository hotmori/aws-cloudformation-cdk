
import {Construct} from "constructs";
import {IVpc, SecurityGroup} from "aws-cdk-lib/aws-ec2";

export class SreMonitoringSecurityGroup {
    readonly security_group: SecurityGroup;
    public constructor(scope: Construct, public prefix:string, public vpc:IVpc) {

        this.security_group = new SecurityGroup(
            scope,
            `${prefix}_MonitoringSecurityGroup`,
            {
                vpc,
                allowAllOutbound: true,
                securityGroupName: `${prefix}_MonitoringSecurityGroup`
            }
        )
    }
}