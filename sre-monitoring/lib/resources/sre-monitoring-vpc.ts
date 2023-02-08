import {Construct} from "constructs";
import {IVpc, Vpc} from "aws-cdk-lib/aws-ec2";

export class SreMonitoringVpc {
    readonly vpc: IVpc;
    public constructor(scope: Construct) {
        this.vpc = Vpc.fromLookup(scope, 'VPC', {
            vpcId: 'vpc-03a3e990c14e40ffc'
        })
    }
}