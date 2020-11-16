"use strict"

import { ServerlessInstance, VPC, VPCDiscovery } from "./types"
import Globals from "./globals"
import EC2Wrapper = require("./aws/ec2-wrapper")

class VPCPlugin {
  private serverless: ServerlessInstance;
  public hooks: object;
  public ec2Wrapper: EC2Wrapper;

  constructor (serverless) {
    this.serverless = serverless
    Globals.serverless = serverless

    /* hooks are the actual code that will run when called */
    this.hooks = {
      "before:package:initialize": this.hookWrapper.bind(this, this.updateVpcConfig)
    }
  }

  /**
   * Wrapper for lifecycle function, initializes variables and checks if enabled.
   * @param lifecycleFunc lifecycle function that actually does desired action
   */
  public async hookWrapper (lifecycleFunc: any) {
    this.validateConfigExists()
    this.initAWSResources()
    return await lifecycleFunc.call(this)
  }

  /**
   * Validate if the plugin config exists
   */
  public validateConfigExists (): void {
    const config = this.serverless.service.custom
    const vpc = config && (config.vpcDiscovery || config.vpc)
    // Checks if the serverless file is setup correctly
    if (!vpc || vpc.vpcName == null || (vpc.subnetNames == null && vpc.securityGroupNames == null)) {
      throw new Error(
        "Serverless file is not configured correctly. " +
        "You must specify the vpcName and at least one of subnetNames or securityGroupNames. " +
        "Please see README for proper setup."
      )
    }
    if (!config.vpcDiscovery) {
      config.vpcDiscovery = config.vpc
      Globals.logWarning(
        "The `vpc` option of `custom` config is deprecated and will be removed in the future. " +
        "Please use `vpcDiscovery` option instead."
      )
    }
  }

  /**
   * Setup AWS resources
   */
  public initAWSResources (): void {
    const credentials = this.serverless.providers.aws.getCredentials()
    credentials.region = this.serverless.providers.aws.getRegion()
    this.ec2Wrapper = new EC2Wrapper(credentials)
  }

  /**
   * Updates functions vpc config
   * @returns {Promise<object>}
   */
  public async updateVpcConfig (): Promise<object> {
    Globals.logInfo("Updating VPC config...")
    const service = this.serverless.service

    // Sets the serverless's vpc config
    if (service.functions) {
      // get basic VPC config
      const basicVpc = await this.getVpcConfig(service.custom.vpcDiscovery)
      // loop through the functions and update VPC config
      for (const fName of Object.keys(service.functions)) {
        const f = service.functions[fName]
        const vpcConf = f.vpcDiscovery
        let vpc = basicVpc

        // check vpcDiscovery config
        if (vpcConf) {
          // skip vpc setup for `disabled` option
          if (vpcConf.disabled) {
            continue
          }
          // validate vpcDiscovery config options
          if (vpcConf.vpcName == null || (vpcConf.subnetNames == null && vpcConf.securityGroupNames == null)) {
            Globals.logWarning(
              `The function '${fName}' is not configured correctly.` +
              "Please see README for proper setup. The provider vpc config are applied"
            )
          } else {
            // override basic config to specific for the function
            vpc = await this.getVpcConfig(vpcConf)
          }
        }
        // init vpc empty config in case not exists
        f.vpc = f.vpc || {}
        if (!f.vpc.subnetIds && vpc.subnetIds) {
          f.vpc.subnetIds = vpc.subnetIds
        }
        if (!f.vpc.securityGroupIds && vpc.securityGroupIds) {
          f.vpc.securityGroupIds = vpc.securityGroupIds
        }
      }
    }

    return service.functions
  }

  /**
   * Gets the desired vpc with the designated subnets and security groups
   * that were set in serverless config file
   * @returns {Promise<object>}
   */
  public async getVpcConfig (vpcDiscovery: VPCDiscovery): Promise<VPC> {
    const vpc = {
      subnetIds: undefined,
      securityGroupIds: undefined
    }
    const vpcId = await this.ec2Wrapper.getVpcId(vpcDiscovery.vpcName)
    if (vpcDiscovery.subnetNames) {
      vpc.subnetIds = await this.ec2Wrapper.getSubnetIds(vpcId, vpcDiscovery.subnetNames)
    }
    if (vpcDiscovery.subnetNames) {
      vpc.securityGroupIds = await this.ec2Wrapper.getSecurityGroupIds(vpcId, vpcDiscovery.securityGroupNames)
    }
    return vpc
  }
}

export = VPCPlugin;
