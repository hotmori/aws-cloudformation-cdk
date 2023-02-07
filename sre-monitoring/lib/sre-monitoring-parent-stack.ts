import * as cdk from 'aws-cdk-lib';
import {NestedStackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {InstanceClass, InstanceSize, InstanceType, MachineImage} from "aws-cdk-lib/aws-ec2"
import {SreMonitoringStackConfig} from "./sre-monitoring-stack-config";
import {SreMonitoringRole} from "./sre-monitoring-role";
import {SreMonitoringInstanceProfile} from "./sre-monitoring-instance-profile"
import {SreMonitoringVpc} from "./sre-monitoring-vpc";
import {SreInstanceConfig} from "./sre-instance-config";
import {SreMonitoringStack} from "./sre-monitoring-stack";
import instancesJson from "../config_instances/instances.json"
import {SreMonitoringNotification} from "./sre-monitoring-notification";
import {SreAlarmActions} from "./sre-alarm-actions";
import {SreMonitoringSecurityGroup} from "./sre-monitoring-security-group";

export class SreMonitoringParentStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);
        const prefix = "SRE"

        const commonConfig = this.getCommonConfiguration(prefix);

        this.getEc2InstancesConfigs(commonConfig)
            .forEach(cfg => {
                const currentProps: NestedStackProps = {
                    description: "Monitoring Stack for " + cfg.instanceProps.instanceName,
                }
                new SreMonitoringStack(this, `${commonConfig.prefix}_InstanceMonitoringStack_${cfg.instanceProps.instanceName}`, cfg, currentProps)
            });
    }

    private getCommonConfiguration(prefix: string): SreMonitoringStackConfig {

        const vpc = new SreMonitoringVpc(this).vpc;
        const role = new SreMonitoringRole (this, prefix).role;
        const instanceProfile = new SreMonitoringInstanceProfile(this, prefix, role.roleName).instance_profile;
        const securityGroup = new SreMonitoringSecurityGroup(this, prefix, vpc).security_group;
        const notification = new SreMonitoringNotification(this, prefix);
        const alarmActions:SreAlarmActions = {dev:notification.action,
                                              prod:notification.action};

        return new SreMonitoringStackConfig(
            prefix,
            vpc,
            instanceProfile,
            role,
            securityGroup,
            alarmActions
        )
    }

    private getEc2InstancesConfigs(commonConfig: SreMonitoringStackConfig): SreInstanceConfig[] {
        let instancesConfig:SreInstanceConfig[]= new Array();

        const instances = instancesJson.instances;
        instances.forEach( (element) => {
            let cfg = this.getInstanceConfig(commonConfig,`${element.instance_name}`,`${element.instance_id}`);
            instancesConfig.push( cfg );
            }
        );

        return instancesConfig;
    }

    private getInstanceConfig(commonConfig: SreMonitoringStackConfig,
                              instanceName:string,
                              instanceId:string): SreInstanceConfig {


        return {
            instanceId,
            instanceProps: {
                vpc: commonConfig.vpc,
                role: commonConfig.role,
                securityGroup: commonConfig.securityGroup,
                instanceName,
                instanceType: InstanceType.of(InstanceClass.T2, InstanceSize.MEDIUM),
                machineImage: MachineImage.lookup({
                    name: 'DI_Evotec_image2',
                    windows: true
                }),
            },
            instanceProfileName: commonConfig.instanceProfile.instanceProfileName,
            alarmAction: commonConfig.alarmAction.dev
        }
    }
}
