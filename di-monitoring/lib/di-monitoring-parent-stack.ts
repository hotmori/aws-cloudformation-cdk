import * as cdk from 'aws-cdk-lib';
import {NestedStackProps, RemovalPolicy} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {DiMonitoringStackConfig} from "./di-monitoring-stack-config";
import {SnsAction} from "aws-cdk-lib/aws-cloudwatch-actions";
import {Topic} from "aws-cdk-lib/aws-sns";
import {InstanceClass, InstanceSize, InstanceType, MachineImage, SecurityGroup, Vpc} from "aws-cdk-lib/aws-ec2";
import {CfnInstanceProfile, ManagedPolicy, Role, ServicePrincipal} from "aws-cdk-lib/aws-iam";
import {DiMonitoringStack} from "./di-monitoring-stack";
import {DiInstanceConfig} from "./di-instance-config";
import {DiAlarmActions} from "./di-alarm-actions";

export class DiMonitoringParentStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);
        const prefix = "DI"

        const commonConfig = this.getCommonConfiguration(prefix);

        this.getEc2InstancesConfigs(commonConfig)
            .forEach(cfg => {
                const currentProps: NestedStackProps = {
                    description: "Monitoring Stack for " + cfg.instanceProps.instanceName,
                }
                new DiMonitoringStack(this, `${cfg.instanceProps.instanceName}MonitoringStack`, cfg, currentProps)
            });
    }

    private getCommonConfiguration(prefix: string): DiMonitoringStackConfig {
        const vpc = Vpc.fromLookup(this, 'VPC', {
            vpcId: 'vpc-03a3e990c14e40ffc'
        })

        const amazonEC2RoleforSSM = ManagedPolicy.fromManagedPolicyArn(this,
            `${prefix}_MonitoringAmazonEC2RoleforSSM`,
            "arn:aws:iam::aws:policy/service-role/AmazonEC2RoleforSSM");
        const cloudWatchAgentAdminPolicy = ManagedPolicy.fromManagedPolicyArn(this,
            `${prefix}_MonitoringCloudWatchAgentAdminPolicy`,
            "arn:aws:iam::aws:policy/CloudWatchAgentAdminPolicy");
        const cloudWatchAgentServerPolicy = ManagedPolicy.fromManagedPolicyArn(this,
            `${prefix}_MonitoringCloudWatchAgentServerPolicy`,
            "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy");
        //
        const role = new Role(
            this,
            `${prefix}_MonitoringCloudAgentSSMRole`,
            {
                assumedBy: new ServicePrincipal('ec2.amazonaws.com')
            }
        )
        role.addManagedPolicy(amazonEC2RoleforSSM);
        role.addManagedPolicy(cloudWatchAgentAdminPolicy);
        role.addManagedPolicy(cloudWatchAgentServerPolicy);

        const instanceProfile = new CfnInstanceProfile(this, `${prefix}_MonitoringInstanceProfile`, {
            roles: [role.roleName]
        })
        instanceProfile.applyRemovalPolicy(RemovalPolicy.RETAIN)

        const securityGroup = new SecurityGroup(this, `${prefix}_MonitoringSecurityGroup`, {
            vpc,
            allowAllOutbound: true,
            securityGroupName: `${prefix}_MonitoringSecurityGroup`
        })

        const topic = Topic.fromTopicArn(this, "DI_CloudWatch_Alarms_Topic", "arn:aws:sns:us-east-1:398910053788:DI_CloudWatch_Alarms_Topic")
        const action = new SnsAction(topic)

        const alarmActions: DiAlarmActions = {
            dev: action,
            prod: action
        }

        return new DiMonitoringStackConfig(
            prefix,
            vpc,
            instanceProfile,
            role,
            securityGroup,
            alarmActions
        )
    }

    private getEc2InstancesConfigs(commonConfig: DiMonitoringStackConfig): DiInstanceConfig[] {
        return [
            this.getEvotecTestInstanceConfig(commonConfig),
            // this.getEvotecProdInstanceConfig(commonConfig),
        ];
    }

    private getEvotecTestInstanceConfig(commonConfig: DiMonitoringStackConfig): DiInstanceConfig {
        const instanceName = `${commonConfig.prefix}_Evotec_TEST`
        return {
            instanceProps: {
                vpc: commonConfig.vpc,
                role: commonConfig.role,
                securityGroup: commonConfig.securityGroup,
                instanceName,
                instanceType: InstanceType.of(InstanceClass.T2, InstanceSize.MEDIUM),
                machineImage: MachineImage.lookup({
                    name: 'DI_Evotec_image',
                    windows: true
                }),
            },
            instanceProfileName: commonConfig.instanceProfile.instanceProfileName,
            alarmAction: commonConfig.alarmActions.dev
        }
    }

    private getEvotecProdInstanceConfig(commonConfig: DiMonitoringStackConfig): DiInstanceConfig {
        const instanceName = `${commonConfig.prefix}_Evotec_PROD`
        return {
            instanceId: 'i-0b0728963b2a5650c',
            instanceProps: {
                vpc: commonConfig.vpc,
                // role: commonConfig.role,
                // securityGroup: commonConfig.securityGroup,
                instanceName,
                instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.LARGE),
                machineImage: MachineImage.lookup({
                    name: 'DI_Evotec_image',
                    windows: true
                }),
            },
            instanceProfileName: commonConfig.instanceProfile.instanceProfileName,
            alarmAction: commonConfig.alarmActions.prod
        }
    }
}
