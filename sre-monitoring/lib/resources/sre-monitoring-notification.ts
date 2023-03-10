import {Subscription, SubscriptionProtocol, Topic} from "aws-cdk-lib/aws-sns";
import {Construct} from "constructs";
import {SnsAction} from "aws-cdk-lib/aws-cloudwatch-actions";

export class SreMonitoringNotification {
    readonly action: SnsAction;
    readonly subscription: Subscription;
    readonly topic: Topic;
    public constructor(scope: Construct, public prefix:string) {

        const topic = new Topic(scope, `${prefix}_MonitoringTopic`,
                                        {displayName:`${prefix}_MonitoringTopic`,
                                        topicName: `${prefix}_MonitoringTopic`});

        const action = new SnsAction(topic);
        this.action = action;
        this.topic = topic;
    }
}