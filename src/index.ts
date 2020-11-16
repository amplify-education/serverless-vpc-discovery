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
      "before:package:initialize": this.hookWrapper.bind(this, this.updateFunctionsVpcConfig)
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
    if (!config.vpcDiscovery) {
      config.vpcDiscovery = config.vpc
      Globals.logWarning(
        "The `vpc` option of `custom` config is deprecated and will be removed in the future. " +
        "Please use `vpcDiscovery` option instead."
      )
    }
    const vpc = config && config.vpcDiscovery
    // Checks if the serverless file is setup correctly
    if (!vpc || vpc.vpcName == null || (vpc.subnetNames == null && vpc.securityGroupNames == null)) {
      throw new Error(
        "Serverless file is not configured correctly. " +
        "You must specify the vpcName and at least one of subnetNames or securityGroupNames. " +
        "Please see README for proper setup."
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
  public async updateFunctionsVpcConfig (): Promise<object> {
    Globals.logInfo("Updating VPC config...")
    const service = this.serverless.service

    // Sets the serverless's vpc config
    if (service.functions) {
      // get basic VPC config
      const basicVPCDiscovery = await this.getVpcConfig(service.custom.vpcDiscovery)
      // loop through the functions and update VPC config
      for (const fName of Object.keys(service.functions)) {
        const f = service.functions[fName]
        const fVPCDiscovery = f.vpcDiscovery

        if (typeof fVPCDiscovery === "boolean" && !fVPCDiscovery) {
          // skip vpc setup for `vpcDiscovery=false` option
          Globals.logInfo(`Skipping VPC config for the function '${fName}'`)
          continue
        }

        const vpcDiscovery = basicVPCDiscovery
        // check vpcDiscovery config
        if (fVPCDiscovery) {
          const noSubnetsAndGroups = fVPCDiscovery.subnetNames == null && fVPCDiscovery.securityGroupNames == null
          // validate vpcDiscovery config options
          if (fVPCDiscovery.vpcName == null || noSubnetsAndGroups) {
            Globals.logWarning(
              `The function '${fName}' is not configured correctly.` +
              "Please see README for proper setup. The basic vpc config are applied"
            )
          } else {
            // merge basic config to specific for the function
            Object.assign(vpcDiscovery, await this.getVpcConfig(fVPCDiscovery))
          }
        }

        // init vpc empty config in case not exists
        f.vpc = f.vpc || {}

        // log warning in case vpc.subnetIds and vpcDiscovery.subnetNames are specified.
        if (f.vpc.subnetIds && fVPCDiscovery.subnetNames) {
          Globals.logWarning(
            `vpc.subnetIds' are specified for the function '${fName}' 
            and overrides 'vpcDiscovery.subnetNames' discovery config.`
          )
        }

        // set vpc.subnetIds
        if (!f.vpc.subnetIds && vpcDiscovery.subnetIds) {
          f.vpc.subnetIds = vpcDiscovery.subnetIds
        }

        // log warning in case vpc.securityGroupIds and vpcDiscovery.securityGroupNames are specified.
        if (f.vpc.securityGroupIds && fVPCDiscovery.securityGroupNames) {
          Globals.logWarning(
            `vpc.securityGroupIds' are specified for the function '${fName}' 
            and overrides 'vpcDiscovery.securityGroupNames' discovery config.`
          )
        }

        // set vpc.securityGroupIds
        if (!f.vpc.securityGroupIds && vpcDiscovery.securityGroupIds) {
          f.vpc.securityGroupIds = vpcDiscovery.securityGroupIds
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
    const vpc = {}
    const vpcId = await this.ec2Wrapper.getVpcId(vpcDiscovery.vpcName)
    if (vpcDiscovery.subnetNames) {
      const subnetIds = await this.ec2Wrapper.getSubnetIds(vpcId, vpcDiscovery.subnetNames)
      Object.assign(vpc, { subnetIds: subnetIds })
    }
    if (vpcDiscovery.securityGroupNames) {
      const securityGroupIds = await this.ec2Wrapper.getSecurityGroupIds(vpcId, vpcDiscovery.securityGroupNames)
      Object.assign(vpc, { securityGroupIds: securityGroupIds })
    }
    return vpc
  }
}

export = VPCPlugin;
