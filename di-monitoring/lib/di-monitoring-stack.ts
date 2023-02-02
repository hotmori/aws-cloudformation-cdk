import * as cdk from 'aws-cdk-lib';
import {Duration, RemovalPolicy} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {
    Alarm,
    AlarmRule,
    AlarmStatusWidget,
    ComparisonOperator,
    CompositeAlarm,
    Dashboard,
    GraphWidget,
    LogQueryVisualizationType,
    LogQueryWidget,
    Metric,
    Stats,
    TreatMissingData
} from "aws-cdk-lib/aws-cloudwatch";
import {IAlarmRule} from "aws-cdk-lib/aws-cloudwatch/lib/alarm-base";
import {DiInstanceConfig} from "./di-instance-config";
import {Instance} from "aws-cdk-lib/aws-ec2";


export class DiMonitoringStack extends cdk.NestedStack {

    private cfg: DiInstanceConfig
    private ec2InstanceId: string;

    constructor(scope: Construct, id: string, instanceConfig: DiInstanceConfig, props?: cdk.NestedStackProps) {
        super(scope, id, props);
        this.cfg = instanceConfig;
        if (this.cfg.instanceId) {
            this.ec2InstanceId = this.cfg.instanceId
        } else {
            this.createInstance();
        }
        this.createDashboard();
    }

    private createInstance() {
        const instance = new Instance(this, this.cfg.instanceProps.instanceName!, this.cfg.instanceProps)
        instance.node.tryRemoveChild('InstanceProfile');
        instance.instance.iamInstanceProfile = this.cfg.instanceProfileName;
        instance.applyRemovalPolicy(RemovalPolicy.RETAIN)
        this.ec2InstanceId = instance.instanceId
    }

    private createDashboard(empty = false) {
        const dashboard = new Dashboard(this, `${this.cfg.instanceProps.instanceName}_Dashboard`, {
            dashboardName: `${this.cfg.instanceProps.instanceName}_Dashboard`,
        })
        dashboard.applyRemovalPolicy(RemovalPolicy.DESTROY)
        if (empty) {
            return;
        }

        const cpuUsageAlarm = this.createCpuUsageAlarm()
        cpuUsageAlarm.addAlarmAction(this.cfg.alarmAction)
        const browserErrorsAlarm = this.createBrowserErrorsAlarm()
        browserErrorsAlarm.addAlarmAction(this.cfg.alarmAction)
        const oracleErrorsAlarm = this.createOracleErrorsAlarm()
        oracleErrorsAlarm.addAlarmAction(this.cfg.alarmAction)

        const generalAlarm = this.createGeneralAlarm([
            cpuUsageAlarm,
            browserErrorsAlarm,
            oracleErrorsAlarm,
        ])
        generalAlarm.addAlarmAction(this.cfg.alarmAction)

        const generalWidget = new AlarmStatusWidget({
            title: `${this.cfg.instanceProps.instanceName} General`,
            alarms: [generalAlarm],
            height: 2,
            width: 6,
        })
        generalWidget.position(0, 0)
        dashboard.addWidgets(generalWidget)

        const alarmsWidget = new AlarmStatusWidget({
            title: `${this.cfg.instanceProps.instanceName} Alarms`,
            alarms: [
                cpuUsageAlarm,
                browserErrorsAlarm,
                oracleErrorsAlarm,
            ],
            height: 2,
            width: 12,
        })
        alarmsWidget.position(0, 2)
        dashboard.addWidgets(alarmsWidget)

        const cpuUsageGraphWidget = new GraphWidget({
            left: [
                new Metric({
                    metricName: "CPUUtilization",
                    namespace: "AWS/EC2",
                    dimensionsMap: {
                        InstanceId: this.ec2InstanceId
                    }
                })
            ],
            stacked: false,
            height: 6,
            width: 6
        })
        cpuUsageGraphWidget.position(0, 4)

        const errorsCountGraphWidget = new GraphWidget({
            left: [
                new Metric({
                    metricName: "Browser_errors_count",
                    namespace: "Dotmatics_metrics"
                })
            ],
            right: [
                new Metric({
                    metricName: "Oracle_errors_count",
                    namespace: "Dotmatics_metrics"
                })
            ],
            period: Duration.seconds(300),
            statistic: Stats.SUM,
            stacked: false,
            height: 6,
            width: 6
        })
        errorsCountGraphWidget.position(6, 4)
        dashboard.addWidgets(cpuUsageGraphWidget, errorsCountGraphWidget)

        const logsQueryWidget = new LogQueryWidget({
            title: 'Consolidated log',
            logGroupNames: [
                'i-0b0728963b2a5650c_alert_orcl_pdb.log',
                'i-0b0728963b2a5650c_browser.log',
                'i-0b0728963b2a5650c_browser.scheduler.log'
            ],
            queryLines: [
                'fields @timestamp, @message, @logStream, @ingestionTime',
                'sort @timestamp desc',
                'limit 500',
            ],
            view: LogQueryVisualizationType.TABLE,
            height: 6,
            width: 24
        })
        logsQueryWidget.position(0, 10)
        dashboard.addWidgets(logsQueryWidget)
    }

    private createBrowserErrorsAlarm(): Alarm {
        return new Alarm(this, `${this.cfg.instanceProps.instanceName}_Browser_Errors_Alarm`, {
            alarmName: `${this.cfg.instanceProps.instanceName} Browser Errors Alarm`,
            // actionsEnabled: true,
            metric: new Metric({
                metricName: "Browser_errors_count",
                namespace: "Dotmatics_metrics",
                statistic: Stats.SUM,
                period: Duration.seconds(300)
            }),
            evaluationPeriods: 1,
            datapointsToAlarm: 1,
            threshold: 1,
            comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            treatMissingData: TreatMissingData.MISSING
        });
    }

    private createOracleErrorsAlarm(): Alarm {
        return new Alarm(this, `${this.cfg.instanceProps.instanceName}_Oracle_Errors_Alarm`, {
            alarmName: `${this.cfg.instanceProps.instanceName} Oracle Errors Alarm`,
            // actionsEnabled: true,
            metric: new Metric({
                metricName: "Oracle_errors_count",
                namespace: "Dotmatics_metrics",
                statistic: Stats.SUM,
                period: Duration.seconds(300)
            }),
            evaluationPeriods: 1,
            datapointsToAlarm: 1,
            threshold: 40,
            comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            treatMissingData: TreatMissingData.NOT_BREACHING
        });
    }

    createCpuUsageAlarm(): Alarm {
        return new Alarm(this, `${this.cfg.instanceProps.instanceName}_CPU_Usage_Alarm`, {
            alarmName: `${this.cfg.instanceProps.instanceName} CPU Usage Alarm`,
            // actionsEnabled: true,
            metric: new Metric({
                metricName: "CPUUtilization",
                namespace: "AWS/EC2",
                dimensionsMap: {
                    InstanceId: this.ec2InstanceId
                }
            }),
            evaluationPeriods: 1,
            datapointsToAlarm: 1,
            threshold: 40,
            comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            treatMissingData: TreatMissingData.MISSING
        });
    }

    private createGeneralAlarm(alarms: IAlarmRule[]): CompositeAlarm {
        const alarmRule = AlarmRule.anyOf(...alarms)
        return new CompositeAlarm(this, `${this.cfg.instanceProps.instanceName}_General_Alarm`, {
            compositeAlarmName: `${this.cfg.instanceProps.instanceName} General Alarm`,
            alarmRule
        })
    }


}
