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
import {SreInstanceConfig} from "../configs/sre-instance-config";
import {SreMonitoringLogGroup} from "../resources/sre-monitoring-log-group";

export class SreMonitoringInstanceStack extends cdk.NestedStack {

  private cfg: SreInstanceConfig
  private ec2InstanceId: string;
  private prefix: string;

  private logGroupBrowser:SreMonitoringLogGroup;
  private logGroupBrowserScheduler:SreMonitoringLogGroup;
  private logGroupOracleAlert:SreMonitoringLogGroup;

  constructor(scope: Construct,
              prefix:string,
              instanceConfig: SreInstanceConfig,
              props?: cdk.NestedStackProps) {
    const id:string = `${prefix}_InstanceMonitoringStack_${instanceConfig.instanceProps.instanceName}`;
    super(scope, id, props);
    this.cfg = instanceConfig;
    this.ec2InstanceId = this.cfg.instanceId;
    this.prefix = prefix;

    this.createLogGroups();
    this.createDashboard();
  }

  private createLogGroups() {

    this.logGroupBrowser = new SreMonitoringLogGroup(this,
                                                     this.prefix,
                                                     this.ec2InstanceId,
                                                     'browser' );
    this.logGroupBrowserScheduler = new SreMonitoringLogGroup(this,
                                                              this.prefix,
                                                              this.ec2InstanceId,
                                                    'browser.scheduler' );
    this.logGroupOracleAlert = new SreMonitoringLogGroup(this,
                                                         this.prefix,
                                                         this.ec2InstanceId,
                                              'oracle.alert' );
  };

  private createDashboard(empty = false) {
    const dashboardName:string = `${this.prefix}_${this.cfg.instanceProps.instanceName}_Dashboard`;
    const dashboard = new Dashboard(this, dashboardName, {
      dashboardName: dashboardName,
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
          `${this.logGroupBrowser.logGroup.logGroupName}`,
          `${this.logGroupBrowserScheduler.logGroup.logGroupName}`,
          `${this.logGroupOracleAlert.logGroup.logGroupName}`
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