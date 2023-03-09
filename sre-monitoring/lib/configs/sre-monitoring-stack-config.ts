import {SreAlarmActions} from "../resources/sre-alarm-actions";
import {SreMonitoringLambdaDatasourcesComplete} from "../resources/sre-monitoring-lambda-ds-complete";

export class SreMonitoringStackConfig {

    public constructor(public prefix: string,
                       public lambda: SreMonitoringLambdaDatasourcesComplete,
                       public alarmActions: SreAlarmActions) {
    }
}
