import {ManagedPolicy, Role, ServicePrincipal} from "aws-cdk-lib/aws-iam";
import {Construct} from "constructs";

export class SreMonitoringRole {
    readonly role: Role;
    public constructor(scope: Construct, public prefix:string) {
        const amazonEC2RoleforSSM = ManagedPolicy.fromManagedPolicyArn(scope,
            `${prefix}_MonitoringAmazonEC2RoleforSSM`,
            "arn:aws:iam::aws:policy/service-role/AmazonEC2RoleforSSM");
        const cloudWatchAgentAdminPolicy = ManagedPolicy.fromManagedPolicyArn(scope,
            `${prefix}_MonitoringCloudWatchAgentAdminPolicy`,
            "arn:aws:iam::aws:policy/CloudWatchAgentAdminPolicy");
        const cloudWatchAgentServerPolicy = ManagedPolicy.fromManagedPolicyArn(scope,
            `${prefix}_MonitoringCloudWatchAgentServerPolicy`,
            "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy");

        this.role = new Role(
            scope,
            `${prefix}_MonitoringCloudAgentSSMRole`,
            {
                assumedBy: new ServicePrincipal('ec2.amazonaws.com')
            }
        )

        this.role.addManagedPolicy(amazonEC2RoleforSSM);
        this.role.addManagedPolicy(cloudWatchAgentAdminPolicy);
        this.role.addManagedPolicy(cloudWatchAgentServerPolicy);
    }
}