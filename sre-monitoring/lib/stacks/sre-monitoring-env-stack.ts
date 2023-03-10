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
  GraphWidgetProps,
  GraphWidgetView,
  LegendPosition,
  LogQueryVisualizationType,
  LogQueryWidget,
  Metric,
  PeriodOverride,
  SingleValueWidget,
  Stats,
  TreatMissingData,
  Unit
} from "aws-cdk-lib/aws-cloudwatch";

import {LambdaDestination} from "aws-cdk-lib/aws-logs-destinations";
import {Subscription, SubscriptionProtocol, Topic} from "aws-cdk-lib/aws-sns";
import {FilterPattern, MetricFilter, SubscriptionFilter} from "aws-cdk-lib/aws-logs";
import {IAlarmRule} from "aws-cdk-lib/aws-cloudwatch/lib/alarm-base";
import { SreEnvConfig } from '../configs/sre-env-config';
import {SreMonitoringLogGroup} from "../resources/sre-monitoring-log-group";

export class SreMonitoringEnvStack extends cdk.NestedStack {

  private cfg: SreEnvConfig
  private ec2AppInstanceId: string;
  private ec2DBInstanceId: string;
  private prefix: string;

  private notificationSubscriptions:Subscription[];
  private logGroupBrowser:SreMonitoringLogGroup;
  private logGroupBrowserScheduler:SreMonitoringLogGroup;
  private logGroupOracleAlert:SreMonitoringLogGroup;
  private metricBrowserErrors:Metric;
  private metricOracleErrors:Metric;
  private metricDatasourcesComplete:Metric;

  constructor(scope: Construct,
              prefix:string,
              instanceConfig: SreEnvConfig,
              props?: cdk.NestedStackProps) {
    const id:string = `${prefix}_EnvMonitoringStack_${instanceConfig.envName}`;
    super(scope, id, props);
    this.cfg = instanceConfig;
    this.ec2AppInstanceId = this.cfg.appInstanceId;
    this.ec2DBInstanceId = this.cfg.dbInstanceId;
    this.prefix = prefix;

    this.createNotificationSubscriptions();
    this.createLogGroups();
    this.createDashboard();
  }

  private createNotificationSubscriptions() {
    
    this.notificationSubscriptions = [];

    for (let email of this.cfg.email_list) {

      const subscription = new Subscription(this,
                                            `${this.prefix}_${this.environment}_${email}_MonitoringSubscription`,
                                            {topic:this.cfg.notification.topic,
                                             protocol:SubscriptionProtocol.EMAIL,
                                             endpoint:`${email}`}
                                             );

      this.notificationSubscriptions.push(subscription);
    }
  }


  private createLogGroups() {

    //Creating an AWS CloudWatch log groups for receiving logs
    this.logGroupBrowser = new SreMonitoringLogGroup(this,
                                                     this.prefix,
                                                     this.ec2AppInstanceId,
                                                     'browser' );
    this.logGroupBrowserScheduler = new SreMonitoringLogGroup(this,
                                                              this.prefix,
                                                              this.ec2AppInstanceId,
                                                    'browser.scheduler' );
    this.logGroupOracleAlert = new SreMonitoringLogGroup(this,
                                                         this.prefix,
                                                         this.ec2DBInstanceId,
                                                        'oracle.alert' );

    //Creating a metric filter for filtering errors
    const metricFilterBrowserFilter = new MetricFilter(this,
        `${this.prefix}_${this.ec2AppInstanceId}_BrowserMetricFilter`,
        { logGroup: this.logGroupBrowser.logGroup,

                metricNamespace: `${this.prefix}_Metrics`,
                metricName:  `${this.prefix}_${this.ec2AppInstanceId}_Browser_errors_count`,
                filterPattern: FilterPattern.anyTerm('ERROR'),
                metricValue: '1',
                defaultValue: 0,
                unit:Unit.COUNT
        });

    this.metricBrowserErrors = metricFilterBrowserFilter.metric({statistic: Stats.SUM,
      period:Duration.seconds(300)});

    const metricFilterOracleErrors = new MetricFilter(this,
        `${this.prefix}_${this.ec2DBInstanceId}_OracleAlertMetricFilter`,
        { logGroup: this.logGroupOracleAlert.logGroup,
          metricNamespace: `${this.prefix}_Metrics`,
          metricName:  `${this.prefix}_${this.ec2DBInstanceId}_Oracle_errors_count`,
          filterPattern: FilterPattern.anyTerm('ORA-'),
          metricValue: '1',
          defaultValue: 0,
          unit:Unit.COUNT
        });

    this.metricOracleErrors = metricFilterOracleErrors.metric({statistic: Stats.SUM,
      period:Duration.seconds(300)})


    this.metricDatasourcesComplete =  new Metric({
        metricName: `${this.prefix}_${this.ec2AppInstanceId}_DatasourcesCompleteTime`,
        namespace: `${this.prefix}_Metrics`,
        period: Duration.minutes(1),
        statistic:"Average",
        unit:Unit.SECONDS
      });

    const subscriptionFilterName:string = `${this.prefix}_${this.ec2AppInstanceId}_DataSourceTimingsSubscriptionFilter`;

    const fn = this.cfg.lambdaDSComplete.lambdaFunction;
    const lambdaDestination = new LambdaDestination(fn);
    const subscriptionFilter = new SubscriptionFilter(this,
        subscriptionFilterName,
        {destination: lambdaDestination,
               filterPattern:FilterPattern.anyTerm('Datasources - complete'),
               logGroup: this.logGroupBrowserScheduler.logGroup
        });

  };

  private createDashboard(empty = false) {
    const dashboardName:string = `${this.prefix}_${this.cfg.envName}_Dashboard`;
    const dashboard = new Dashboard(this, dashboardName, {
      dashboardName: dashboardName,
      periodOverride:PeriodOverride.INHERIT,
      start:"-P1W"
    })
    dashboard.applyRemovalPolicy(RemovalPolicy.DESTROY)
    if (empty) {
      return;
    }

    const cpuUsageAlarm = this.createCpuUsageAlarm()
    const browserErrorsAlarm = this.createBrowserErrorsAlarm()
    const oracleErrorsAlarm = this.createOracleErrorsAlarm()
    const dsCompleteAlarm = this.createDatasourcesCompleteAlarm()
    const generalAlarm = this.createGeneralAlarm([
      cpuUsageAlarm,
      browserErrorsAlarm,
      oracleErrorsAlarm,
      dsCompleteAlarm
    ])

    generalAlarm.addAlarmAction(this.cfg.alarmAction)
    cpuUsageAlarm.addAlarmAction(this.cfg.alarmAction)
    browserErrorsAlarm.addAlarmAction(this.cfg.alarmAction)
    oracleErrorsAlarm.addAlarmAction(this.cfg.alarmAction)
    dsCompleteAlarm.addAlarmAction(this.cfg.alarmAction)

    const generalWidget = new AlarmStatusWidget({
      title: `${this.cfg.envName} General`,
      alarms: [generalAlarm],
      height: 3,
      width: 10,
    })


    const alarmsWidget = new AlarmStatusWidget({
      title: `All alarms`,
      alarms: [
        cpuUsageAlarm,
        browserErrorsAlarm,
        oracleErrorsAlarm,
        dsCompleteAlarm
      ],
      height: 3,
      width: 10,
    })

    const cpuUsageGraphWidget = new GraphWidget({
      left: [
        new Metric({
          metricName: "CPUUtilization",
          namespace: "AWS/EC2",
          dimensionsMap: {
            InstanceId: this.ec2AppInstanceId
          }
        })
      ],
      stacked: false,
      height: 5,
      width: 10
    })

    const errorsApplicationCountGraphWidget = new GraphWidget({
      left: [
        this.metricBrowserErrors
      ],
      title: "Application Errors Count",
      period: Duration.seconds(300),
      statistic: Stats.SUM,
      stacked: false,
      height: 5,
      width: 10
    })

    const errorsDBCountGraphWidget = new GraphWidget({
      left: [
        this.metricOracleErrors
      ],
      title: "DB Errors Count",
      period: Duration.seconds(300),
      statistic: Stats.SUM,
      stacked: false,
      height: 5,
      width: 10
    })
    
    const datasourcesCompleteTimeWidget = new SingleValueWidget({
      metrics: [
        this.metricDatasourcesComplete
      ],
      title: `Datasources Complete Time: latest`,
      height: 3,
      width: 5
    })

    const logsDatasourceCompleteWidget = new LogQueryWidget({
      title: 'Datasources complete timings',
      logGroupNames: [
        `${this.logGroupBrowserScheduler.logGroup.logGroupName}`
      ],
      queryLines: [
        'fields @timestamp, @ingestionTime',
        'parse @message /Datasources - complete in\\s*(?<CompleteTime>[0-9]+(\\.[0-9]+)?)/',
        'filter @message like \'Datasources - complete\'',
        'sort @timestamp desc',
        'limit 100',
        'display @timestamp, @message, CompleteTime/1000/60 as CompleteTimeMinutes'
      ],
      view: LogQueryVisualizationType.TABLE,
      height: 4,
      width: 20
    })

    const logsDatasourceUpdatingWidget = new LogQueryWidget({
      title: 'Datasources updating timings',
      logGroupNames: [
        `${this.logGroupBrowserScheduler.logGroup.logGroupName}`
      ],
      queryLines: [
        'fields @timestamp, @message, @logStream, @ingestionTime',
        'filter @message like \'Datasources - updating\'',
        'sort @timestamp desc',
        'limit 100',
      ],
      view: LogQueryVisualizationType.TABLE,
      height: 4,
      width: 20
    })

    const logsConsolidatedQueryWidget = new LogQueryWidget({
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
      height: 8,
      width: 20
    })

    //layout
    generalWidget.position(0, 0)
    alarmsWidget.position(10, 0)

    errorsApplicationCountGraphWidget.position(0, 3)
    errorsDBCountGraphWidget.position(0, 8)

    cpuUsageGraphWidget.position(10, 3)

    datasourcesCompleteTimeWidget.position(10, 8)

    logsDatasourceCompleteWidget.position(0, 13)    
    logsDatasourceUpdatingWidget.position(0, 17)
    logsConsolidatedQueryWidget.position(0, 21)

    dashboard.addWidgets(
      generalWidget,
      alarmsWidget,
      cpuUsageGraphWidget,
      errorsApplicationCountGraphWidget,
      errorsDBCountGraphWidget,
      datasourcesCompleteTimeWidget,
      logsDatasourceCompleteWidget,
      logsDatasourceUpdatingWidget,
      logsConsolidatedQueryWidget
      )    
  }


  private createBrowserErrorsAlarm(): Alarm {
    return new Alarm(this, `${this.prefix}_${this.cfg.envName}_Browser_Errors_Alarm`, {
      alarmName: `${this.prefix}_${this.cfg.envName} Browser Errors Alarm`,
      // actionsEnabled: true,
      metric: this.metricBrowserErrors,
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      threshold: 1,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.BREACHING
    });
  }

  private createOracleErrorsAlarm(): Alarm {
    return new Alarm(this, `${this.prefix}_${this.cfg.envName}_Oracle_Errors_Alarm`, {
      alarmName: `${this.prefix}_${this.cfg.envName} Oracle Errors Alarm`,
      // actionsEnabled: true,
      metric: this.metricOracleErrors,
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      threshold: 1,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING
    });
  }

  createCpuUsageAlarm(): Alarm {
    return new Alarm(this, `${this.prefix}_${this.cfg.envName}_CPU_Usage_Alarm`, {
      alarmName: `${this.prefix}_${this.cfg.envName} CPU Usage Alarm`,
      // actionsEnabled: true,
      metric: new Metric({
        metricName: "CPUUtilization",
        namespace: "AWS/EC2",
        dimensionsMap: {
          InstanceId: this.ec2AppInstanceId
        }
      }),
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      threshold: 40,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.MISSING
    });
  }

  private createDatasourcesCompleteAlarm(): Alarm {
    return new Alarm(this, `${this.prefix}_${this.cfg.envName}_DatasourcesComplete_Alarm`, {
      alarmName: `${this.prefix}_${this.cfg.envName} Datasources Complete Alarm`,
      metric: this.metricDatasourcesComplete,
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      threshold: 60*60,

      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING
    });
  }

  private createGeneralAlarm(alarms: IAlarmRule[]): CompositeAlarm {
    const alarmRule = AlarmRule.anyOf(...alarms)
    return new CompositeAlarm(this, `${this.prefix}_${this.cfg.envName}_General_Alarm`, {
      compositeAlarmName: `${this.prefix}_${this.cfg.envName} General Health`,
      alarmRule
    })
  }

}
