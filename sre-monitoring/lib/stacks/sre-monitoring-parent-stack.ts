import * as cdk from 'aws-cdk-lib';
import {NestedStackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {InstanceClass, InstanceSize, InstanceType, MachineImage} from "aws-cdk-lib/aws-ec2"
import {SreMonitoringStackConfig} from "../configs/sre-monitoring-stack-config";
import {SreMonitoringRole} from "../resources/sre-monitoring-role";
import {SreMonitoringInstanceProfile} from "../resources/sre-monitoring-instance-profile"
import {SreMonitoringVpc} from "../resources/sre-monitoring-vpc";
import {SreInstanceConfig} from "../configs/sre-instance-config";
import {SreMonitoringInstanceStack} from "./sre-monitoring-instance-stack";
import instancesJson from "../../config_instances/instances.json"
import {SreMonitoringNotification} from "../resources/sre-monitoring-notification";
import {SreAlarmActions} from "../resources/sre-alarm-actions";
import {SreMonitoringSecurityGroup} from "../resources/sre-monitoring-security-group";

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
                new SreMonitoringInstanceStack(this,
                    commonConfig.prefix,
                    cfg,
                    currentProps)
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
        return instancesJson.instances
            .map(instance => this.getInstanceConfig(commonConfig, instance.instance_name, instance.instance_id));
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
            alarmAction: commonConfig.alarmActions.dev
        }
    }
}
