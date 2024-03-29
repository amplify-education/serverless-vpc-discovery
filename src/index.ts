"use strict";

import { ServerlessInstance, VPCDiscovery, ServerlessUtils } from "./types";
import { LambdaFunction } from "./common/lambda-function";
import Globals from "./globals";
import { validateVPCDiscoveryConfig } from "./validation";
import { customProperties, functionProperties } from "./schema";
import Logging from "./logging";
import { loadConfig } from "@smithy/node-config-provider";
import { NODE_REGION_CONFIG_FILE_OPTIONS, NODE_REGION_CONFIG_OPTIONS } from "@smithy/config-resolver";

class VPCPlugin {
  private serverless: ServerlessInstance;
  public hooks: object;
  public lambdaFunction: LambdaFunction;

  constructor (serverless, options, v3Utils?: ServerlessUtils) {
    this.serverless = serverless;

    Globals.serverless = serverless;
    Globals.options = options;

    if (v3Utils?.log) {
      Globals.v3Utils = v3Utils;
    }

    /* hooks are the actual code that will run when called */
    this.hooks = {
      "before:package:initialize": this.hookWrapper.bind(this, this.updateFunctionsVpcConfig)
    };

    serverless.configSchemaHandler.defineCustomProperties(customProperties);
    serverless.configSchemaHandler.defineFunctionProperties("aws", functionProperties);
  }

  /**
   * Wrapper for lifecycle function, initializes variables and checks if enabled.
   * @param lifecycleFunc lifecycle function that actually does desired action
   */
  public async hookWrapper (lifecycleFunc: any) {
    this.validateCustomVPCDiscoveryConfig();
    await this.initResources();
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
  public updateVPCDiscoveryConfigCompatibility (vpcDiscovery: VPCDiscovery): void {
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
        Logging.logWarning(
          "The `vpcDiscovery.subnetNames` and `vpcDiscovery.securityGroupNames` options are deprecated " +
          "and will be removed in the future. Please see README for proper setup."
        );
      }
    }
  }

  /**
   * Setup AWS resources
   */
  public async initResources (): Promise<void> {
    // setup AWS resources
    await this.initSLSCredentials();
    await this.initAWSRegion();

    const baseVPCDiscovery = this.serverless.service.custom ? this.serverless.service.custom.vpcDiscovery : null;
    this.lambdaFunction = new LambdaFunction(Globals.credentials, baseVPCDiscovery);

    // start of the legacy AWS SDK V2 creds support
    // TODO: remove it in case serverless will add V3 support
    try {
      await this.lambdaFunction.ec2Wrapper.getVpcs();
    } catch (error) {
      if (error.message.includes("Could not load credentials from any providers")) {
        Globals.credentials = this.serverless.providers.aws.getCredentials();
        this.lambdaFunction = new LambdaFunction(Globals.credentials, baseVPCDiscovery);
      }
    }
  }

  /**
   * Init AWS credentials based on sls `provider.profile`
   */
  public async initSLSCredentials (): Promise<void> {
    const slsProfile = Globals.options["aws-profile"] || Globals.serverless.service.provider.profile;
    Globals.credentials = slsProfile ? await Globals.getProfileCreds(slsProfile) : null;
  }

  /**
   * Init AWS current region based on Node options
   */
  public async initAWSRegion (): Promise<void> {
    try {
      Globals.currentRegion = await loadConfig(NODE_REGION_CONFIG_OPTIONS, NODE_REGION_CONFIG_FILE_OPTIONS)();
    } catch (err) {
      Logging.logInfo("Node region was not found.");
    }
  }

  /**
   * Updates functions vpc config
   * @returns {Promise<object>}
   */
  public async updateFunctionsVpcConfig (): Promise<object> {
    Logging.logInfo("Updating VPC config...");
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
        Logging.logWarning(
          `vpc.subnetIds' are specified for the function '${funcName}' ` +
          "and overrides 'vpcDiscovery.subnets' discovery config."
        );
      }
      // log warning in case vpc.securityGroupIds and vpcDiscovery.securityGroupNames are specified.
      if (func.vpc.securityGroupIds && func.vpcDiscovery && func.vpcDiscovery.securityGroups) {
        Logging.logWarning(
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

export = VPCPlugin;
