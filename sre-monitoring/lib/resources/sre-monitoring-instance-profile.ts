import {CfnInstanceProfile} from "aws-cdk-lib/aws-iam";
import {Construct} from "constructs";
import {RemovalPolicy} from "aws-cdk-lib";

export class SreMonitoringInstanceProfile {
    readonly instance_profile: CfnInstanceProfile;
    public constructor(scope: Construct,
                       public prefix:string,
                       public role_name:string) {
        this.instance_profile = new CfnInstanceProfile(scope, `${prefix}_MonitoringInstanceProfile`, {
            roles: [role_name]
        })
        this.instance_profile.applyRemovalPolicy(RemovalPolicy.RETAIN)
    }
}