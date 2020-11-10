"use strict"

import { ServerlessInstance } from "./types"
import { EC2Wrapper } from "./aws/ec2-wrapper"

class VPCPlugin {
  private serverless: ServerlessInstance;
  public hooks: object;
  public ec2Wrapper: EC2Wrapper;

  constructor (serverless) {
    this.serverless = serverless

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
    // check if `customDomain` or `customDomains` config exists
    this.validateConfigExists()
    // setup AWS resources
    this.initAWSResources()
    return await lifecycleFunc.call(this)
  }

  /**
   * Validate if the plugin config exists
   */
  public validateConfigExists (): void {
    const config = this.serverless.service.custom
    const vpc = config && config.vpc
    // Checks if the serverless file is setup correctly
    if (!vpc || vpc.vpcName == null || vpc.subnetNames == null || vpc.securityGroupNames == null) {
      throw new Error("Serverless file is not configured correctly. Please see README for proper setup.")
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
   * Gets the desired vpc with the designated subnets and security groups
   * that were set in serverless config file
   * @returns {Promise<object>}
   */
  public async updateVpcConfig (): Promise<object> {
    this.serverless.cli.log("Updating VPC config...")

    const service = this.serverless.service

    const vpcId = await this.ec2Wrapper.getVpcId(service.custom.vpc.vpcName)
    const subnetIds = await this.ec2Wrapper.getSubnetIds(vpcId, service.custom.vpc.subnetNames)
    const securityGroupIds = await this.ec2Wrapper.getSecurityGroupIds(vpcId, service.custom.vpc.securityGroupNames)

    service.provider.vpc = {
      subnetIds: subnetIds,
      securityGroupIds: securityGroupIds
    }

    return service.provider.vpc
  }
}

export = VPCPlugin;
