import {Subscription, SubscriptionProtocol, Topic} from "aws-cdk-lib/aws-sns";
import {Construct} from "constructs";
import {SnsAction} from "aws-cdk-lib/aws-cloudwatch-actions";

export class SreMonitoringNotification {
    readonly action: SnsAction;
    readonly subscription: Subscription;
    public constructor(scope: Construct, public prefix:string) {

        const topic = new Topic(scope, `${prefix}_MonitoringTopic`);
        const subscription = new Subscription(scope,
                                         `${prefix}_MonitoringSubscription`,
                                         {topic,
                                                protocol:SubscriptionProtocol.EMAIL,
                                                endpoint:`test@dx.com`
        })
        const action = new SnsAction(topic);

        this.subscription = subscription;
        this.action = action;

    }
}