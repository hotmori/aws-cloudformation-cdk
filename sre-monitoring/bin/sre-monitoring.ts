#!/usr/bin/env node
import 'source-map-support/register';

import * as cdk from 'aws-cdk-lib';
import {SreMonitoringParentStack} from "../lib/stacks/sre-monitoring-parent-stack";
import {CfnParameter} from "aws-cdk-lib";

const app = new cdk.App();
const sandboxAccountID:string = '398910053788';
const prodAccountID:string = '890203736154';

const envSandboxUSA  = { account: sandboxAccountID, region: 'us-east-1' };
const envSandboxEU  = { account: sandboxAccountID, region: 'eu-central-1' };
const envProdUSA = { account: prodAccountID, region: 'us-east-1' };

const app1 = new SreMonitoringParentStack(app, 'SreMonitoringParentStack', {
    env: envSandboxUSA,
    description: "Parent Stack for SRE Monitoring"
});

// uncomment when prod is ready to deploy
//const app2 = new SreMonitoringParentStack(app, 'SreMonitoringParentStackProd',{
//    env: envProdUSA,
//    description: "Parent Stack for SRE Monitoring Prod"});