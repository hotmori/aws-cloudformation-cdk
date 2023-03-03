import * as cdk from 'aws-cdk-lib';
import {NestedStackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {SreMonitoringStackConfig} from "../configs/sre-monitoring-stack-config";
import {SreMonitoringRole} from "../resources/sre-monitoring-role";
import {SreInstanceConfig} from "../configs/sre-instance-config";
import {SreMonitoringInstanceStack} from "./sre-monitoring-instance-stack";
import instancesJson from "../../config_instances/instances.json"
import {SreMonitoringNotification} from "../resources/sre-monitoring-notification";
import {SreAlarmActions} from "../resources/sre-alarm-actions";

export class SreMonitoringParentStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: cdk.StackProps) {
        super(scope, id, props);
        const prefix = "SRE";

        const commonConfig = this.getCommonConfiguration(prefix);

        this.getEc2InstancesConfigs(commonConfig)
            .forEach(cfg => {
                const currentProps: NestedStackProps = {
                    description: "Monitoring Stack for " + cfg.instanceName,
                }
                new SreMonitoringInstanceStack(this,
                    commonConfig.prefix,
                    cfg,
                    currentProps)
            });
    }

    private getCommonConfiguration(prefix: string): SreMonitoringStackConfig {
        //role is needed as common resource
        const role = new SreMonitoringRole (this, prefix).role;
        const notification = new SreMonitoringNotification(this, prefix);
        const alarmActions:SreAlarmActions = {dev:notification.action,
                                              prod:notification.action};



        return new SreMonitoringStackConfig(
            prefix,
            alarmActions
        )
    }

    private getEc2InstancesConfigs(commonConfig: SreMonitoringStackConfig): SreInstanceConfig[] {
        // @ts-ignore
        return instancesJson.region[this.region]
            .map((instance: { instance_name: string; instance_id: string; }) => this.getInstanceConfig(commonConfig, instance.instance_name, instance.instance_id));
    }

    private getInstanceConfig(commonConfig: SreMonitoringStackConfig,
                              instanceName:string,
                              instanceId:string): SreInstanceConfig {


        return {
            instanceId,
            instanceName,
            alarmAction: commonConfig.alarmActions.dev
        }
    }
}
