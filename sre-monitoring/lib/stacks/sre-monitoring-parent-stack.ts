import * as cdk from 'aws-cdk-lib';
import {NestedStackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {SreMonitoringStackConfig} from "../configs/sre-monitoring-stack-config";
import {SreMonitoringRole} from "../resources/sre-monitoring-role";
import {SreEnvConfig} from "../configs/sre-env-config";
import {SreMonitoringEnvStack} from "./sre-monitoring-env-stack";
import instancesJson from "../../config_instances/instances.json"
import {SreMonitoringNotification} from "../resources/sre-monitoring-notification";
import {SreAlarmActions} from "../resources/sre-alarm-actions";
import {SreMonitoringLambdaDatasourcesComplete} from "../resources/sre-monitoring-lambda-ds-complete";

export class SreMonitoringParentStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: cdk.StackProps) {
        super(scope, id, props);
        const prefix = "SRE";

        const commonConfig = this.getCommonConfiguration(prefix);

        this.getEnvironmentConfigs(commonConfig)
            .forEach(cfg => {
                const currentProps: NestedStackProps = {
                    description: "Monitoring Stack for " + cfg.envName,
                }
                new SreMonitoringEnvStack(this,
                    commonConfig.prefix,
                    cfg,
                    currentProps)
            });
    }

    private getCommonConfiguration(prefix: string): SreMonitoringStackConfig {
        //role is needed as common resource
        const role = new SreMonitoringRole (this, prefix).role;
        const lambda = new SreMonitoringLambdaDatasourcesComplete(this, prefix);
        const notification = new SreMonitoringNotification(this, prefix);
        const alarmActions:SreAlarmActions = {dev:notification.action,
                                              prod:notification.action};



        return new SreMonitoringStackConfig(
            prefix,
            lambda,
            alarmActions
        )
    }

    private getEnvironmentConfigs(commonConfig: SreMonitoringStackConfig): SreEnvConfig[] {
        // @ts-ignore
        return instancesJson.region[this.region]
            .map((env: { env_name: string;
                         app_instance_id: string;
                         db_instance_id: string; }) =>
                       this.getEnvConfig(commonConfig,
                                         env.env_name,
                                         env.app_instance_id,
                                         env.db_instance_id));
    }

    private getEnvConfig(commonConfig: SreMonitoringStackConfig,
                         envName:string,
                         appInstanceId:string,
                         dbInstanceId:string): SreEnvConfig {


        return {
            appInstanceId: appInstanceId,
            dbInstanceId:dbInstanceId,
            envName: envName,
            lambda:commonConfig.lambda,
            alarmAction: commonConfig.alarmActions.dev
        }
    }
}
