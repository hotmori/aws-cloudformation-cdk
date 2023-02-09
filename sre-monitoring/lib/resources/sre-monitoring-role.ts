import {ManagedPolicy, Role, ServicePrincipal} from "aws-cdk-lib/aws-iam";
import {Construct} from "constructs";

export class SreMonitoringRole {
    readonly role: Role;
    public constructor(scope: Construct, public prefix:string) {
        const amazonEC2RoleforSSM = ManagedPolicy.fromManagedPolicyArn(scope,
            `${prefix}_MonitoringAmazonEC2RoleforSSM`,
            "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore");
        const cloudWatchAgentAdminPolicy = ManagedPolicy.fromManagedPolicyArn(scope,
            `${prefix}_MonitoringCloudWatchAgentAdminPolicy`,
            "arn:aws:iam::aws:policy/CloudWatchAgentAdminPolicy");
        const cloudWatchAgentServerPolicy = ManagedPolicy.fromManagedPolicyArn(scope,
            `${prefix}_MonitoringCloudWatchAgentServerPolicy`,
            "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy");

        const roleName:string = `${prefix}_MonitoringCloudAgentSSMRole`;
        this.role = new Role(
            scope,
            roleName,
            {
                assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
                roleName: roleName
            }
        )

        this.role.addManagedPolicy(amazonEC2RoleforSSM);
        this.role.addManagedPolicy(cloudWatchAgentAdminPolicy);
        this.role.addManagedPolicy(cloudWatchAgentServerPolicy);
    }
}