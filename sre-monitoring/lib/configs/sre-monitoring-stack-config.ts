import {SreAlarmActions} from "../resources/sre-alarm-actions";
import {SreMonitoringLambdaDatasourcesComplete} from "../resources/sre-monitoring-lambda-ds-complete";
import { SreMonitoringNotification } from '../resources/sre-monitoring-notification';

export class SreMonitoringStackConfig {

    public constructor(public prefix: string,
                       public lambda: SreMonitoringLambdaDatasourcesComplete,
                       public alarmActions: SreAlarmActions,
                       public notification: SreMonitoringNotification) {
    }
}
