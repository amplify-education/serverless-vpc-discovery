"use strict";

import { ServerlessInstance } from "./types";
import { LambdaFunction } from "./common/lambda-function";
import Globals from "./globals";

class VPCPlugin {
  private serverless: ServerlessInstance;
  public hooks: object;
  public awsCredentials: any;
  public lambdaFunction: LambdaFunction;

  constructor (serverless) {
    this.serverless = serverless;
    Globals.serverless = serverless;

    /* hooks are the actual code that will run when called */
    this.hooks = {
      "before:package:initialize": this.hookWrapper.bind(this, this.updateFunctionsVpcConfig)
    };
  }

  /**
   * Wrapper for lifecycle function, initializes variables and checks if enabled.
   * @param lifecycleFunc lifecycle function that actually does desired action
   */
  public async hookWrapper (lifecycleFunc: any) {
    this.validateCustomVPCDiscovery();
    this.initResources();
    return await lifecycleFunc.call(this);
  }

  /**
   * Validate if the plugin config exists
   */
  public validateCustomVPCDiscovery (): void {
    const config = this.serverless.service.custom;
    if (config && !config.vpcDiscovery && config.vpc) {
      config.vpcDiscovery = config.vpc;
      Globals.logWarning(
        "The `vpc` option of `custom` config is deprecated and will be removed in the future. " +
        "Please use the `vpcDiscovery` option instead."
      );
    }
    const vpc = config && config.vpcDiscovery;
    // Checking the vpcDiscovery config is setup correctly if exists
    if (vpc && (vpc.vpcName == null || (vpc.subnetNames == null && vpc.securityGroupNames == null))) {
      throw new Error(
        "The `custom.vpcDiscovery` is not configured correctly. " +
        "You must specify the vpcName and at least one of subnetNames or securityGroupNames. " +
        "Please see README for proper setup."
      );
    }
  }

  /**
   * Setup AWS resources
   */
  public initResources (): void {
    this.awsCredentials = this.serverless.providers.aws.getCredentials();
    this.awsCredentials.region = this.serverless.providers.aws.getRegion();

    const baseVPCDiscovery = this.serverless.service.custom ? this.serverless.service.custom.vpcDiscovery : null;
    this.lambdaFunction = new LambdaFunction(this.awsCredentials, baseVPCDiscovery);
  }

  /**
   * Updates functions vpc config
   * @returns {Promise<object>}
   */
  public async updateFunctionsVpcConfig (): Promise<object> {
    Globals.logInfo("Updating VPC config...");
    const service = this.serverless.service;

    // Sets the serverless's vpc config
    if (service.functions) {
      // loop through the functions and update VPC config
      // eslint-disable-next-line guard-for-in
      for (const funcName in service.functions) {
        // eslint-disable-next-line
        const func = service.functions[funcName];
        const funcVPC = await this.lambdaFunction.getFuncVPC(funcName, func.vpcDiscovery);

        if (!funcVPC) {
          continue;
        }

        // init vpc empty config in case not exists
        func.vpc = func.vpc || {};
        // log warning in case vpc.subnetIds and vpcDiscovery.subnetNames are specified.
        if (func.vpc.subnetIds && func.vpcDiscovery && func.vpcDiscovery.subnetNames) {
          Globals.logWarning(
            `vpc.subnetIds' are specified for the function '${funcName}' 
            and overrides 'vpcDiscovery.subnetNames' discovery config.`
          );
        }
        // log warning in case vpc.securityGroupIds and vpcDiscovery.securityGroupNames are specified.
        if (func.vpc.securityGroupIds && func.vpcDiscovery && func.vpcDiscovery.securityGroupNames) {
          Globals.logWarning(
            `vpc.securityGroupIds' are specified for the function '${funcName}' 
            and overrides 'vpcDiscovery.securityGroupNames' discovery config.`
          );
        }

        // set vpc.subnetIds if it does not exists
        if (!func.vpc.subnetIds && funcVPC.subnetIds) {
          func.vpc.subnetIds = funcVPC.subnetIds;
        }

        // set vpc.securityGroupIds if it does not exists
        if (!func.vpc.securityGroupIds && funcVPC.securityGroupIds) {
          func.vpc.securityGroupIds = funcVPC.securityGroupIds;
        }
      }
    }

    return service.functions;
  }
}

export = VPCPlugin;
