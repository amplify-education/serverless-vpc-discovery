"use strict";

import { FuncVPCDiscovery, ServerlessInstance, VPCDiscovery } from "./types";
import { LambdaFunction } from "./common/lambda-function";
import Globals from "./globals";
import { validateVPCDiscoveryConfig } from "./validation";

export default class VPCPlugin {
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
    this.validateCustomVPCDiscoveryConfig();
    this.initResources();
    return await lifecycleFunc.call(this);
  }

  /**
   * Validate if the plugin config exists
   */
  public validateCustomVPCDiscoveryConfig (): void {
    const config = this.serverless.service.custom;
    const vpcDiscovery = config && config.vpcDiscovery;

    if (vpcDiscovery) {
      // support backward compatibility
      this.updateVPCDiscoveryConfigCompatibility(vpcDiscovery);

      // validate config
      try {
        // the validateVPCDiscoveryConfig is general for custom and func configs
        // so try catch for extend error message with `custom.vpcDiscovery` as a source
        validateVPCDiscoveryConfig(vpcDiscovery);
      } catch (e) {
        throw new Error(
          `The \`custom.vpcDiscovery\` is not configured correctly: \n${e} ` + " Please see README for proper setup."
        );
      }
    }
  }

  /**
   * This function update VPC Discovery config to support version 2.x config structure and show warning errors
   */
  public updateVPCDiscoveryConfigCompatibility (vpcDiscovery: VPCDiscovery | FuncVPCDiscovery): void {
    // support backward compatibility
    if (vpcDiscovery && (vpcDiscovery.subnetNames || vpcDiscovery.securityGroupNames)) {
      // convert `vpcDiscovery.subnetNames` or `vpcDiscovery.securityGroupNames` to the new config structure
      if (!vpcDiscovery.subnets && !vpcDiscovery.securityGroups) {
        if (vpcDiscovery.subnetNames) {
          vpcDiscovery.subnets = [{ tagKey: "Name", tagValues: vpcDiscovery.subnetNames }];
        }
        if (vpcDiscovery.securityGroupNames) {
          vpcDiscovery.securityGroups = [{ names: vpcDiscovery.securityGroupNames }];
        }
        Globals.logWarning(
          "The `vpcDiscovery.subnetNames` and `vpcDiscovery.securityGroupNames` options are deprecated " +
          "and will be removed in the future. Please see README for proper setup."
        );
      } else {
        // log warning in case mixed config are specified
        Globals.logWarning(
          "The `vpcDiscovery.subnetNames` and `vpcDiscovery.securityGroupNames` are deprecated " +
          "and will not be applied. Please remove mentioned option to not see this warning message."
        );
      }
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
    const functions = service.functions || {};

    // Sets the serverless's vpc config
    // loop through the functions and update VPC config
    for (const funcName of Object.keys(functions)) {
      const func = service.functions[funcName];
      this.updateVPCDiscoveryConfigCompatibility(func.vpcDiscovery);
      const funcVPC = await this.lambdaFunction.getFuncVPC(funcName, func.vpcDiscovery);

      if (!funcVPC) {
        continue;
      }

      // init vpc empty config in case not exists
      func.vpc = func.vpc || {};
      // log warning in case vpc.subnetIds and vpcDiscovery.subnetNames are specified.
      if (func.vpc.subnetIds && func.vpcDiscovery && func.vpcDiscovery.subnets) {
        Globals.logWarning(
          `vpc.subnetIds' are specified for the function '${funcName}' ` +
          "and overrides 'vpcDiscovery.subnets' discovery config."
        );
      }
      // log warning in case vpc.securityGroupIds and vpcDiscovery.securityGroupNames are specified.
      if (func.vpc.securityGroupIds && func.vpcDiscovery && func.vpcDiscovery.securityGroups) {
        Globals.logWarning(
          `vpc.securityGroupIds' are specified for the function '${funcName}' ` +
          "and overrides 'vpcDiscovery.securityGroups' discovery config."
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

    return service.functions;
  }
}
