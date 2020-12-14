import { EC2Wrapper } from "../aws/ec2-wrapper";
import { VPCDiscovery, FuncVPCDiscovery, VPC } from "../types";
import Globals from "../globals";
import { isObjectEmpty } from "../utils";
import { validateVPCDiscoveryConfig } from "../validation";

export class LambdaFunction {
  private ec2Wrapper: EC2Wrapper;
  private readonly basicVPCDiscovery?: VPCDiscovery;

  constructor (credentials: any, basicVPCDiscovery: VPCDiscovery) {
    this.ec2Wrapper = new EC2Wrapper(credentials);
    this.basicVPCDiscovery = basicVPCDiscovery;
  }

  /**
   * Validate and return VPC config for the given function
   * @returns {Promise<VPC>}
   */
  public async getFuncVPC (funcName: string, funcVPCDiscovery: FuncVPCDiscovery): Promise<VPC> {
    if (typeof funcVPCDiscovery === "boolean" && !funcVPCDiscovery) {
      // skip vpc setup for `vpcDiscovery=false` option
      Globals.logInfo(`Skipping VPC config for the function '${funcName}'`);
      return null;
    }

    // inherit the `custom.vpcDiscovery`
    const vpcDiscovery = Object.assign({}, this.basicVPCDiscovery, funcVPCDiscovery);

    // return null in case vpcDiscovery not setup
    if (isObjectEmpty(vpcDiscovery)) {
      return null;
    }

    // validate func vpcDiscovery config
    try {
      validateVPCDiscoveryConfig(vpcDiscovery);
    } catch (e) {
      throw new Error(
        `Function '${funcName}' is not configured correctly: ${e} VPC not configured. ` +
        "Please see the README for the proper setup."
      );
    }

    try {
      Globals.logInfo(`Getting VPC config for the function: '${funcName}'\n`);
      return await this.getVpcConfig(vpcDiscovery);
    } catch (e) {
      Globals.logError(`Function '${funcName}' VPC not configured based on the error: ${e}`);
    }
    return null;
  }

  /**
   * Gets the desired vpc with the designated subnets and security groups
   * that were set in serverless config file
   * @returns {Promise<object>}
   */
  private async getVpcConfig (vpcDiscovery: VPCDiscovery): Promise<VPC> {
    const vpc: VPC = {};
    const vpcId = await this.ec2Wrapper.getVpcId(vpcDiscovery.vpcName);

    Globals.logInfo(`Found VPC with id '${vpcId}'`);

    if (vpcDiscovery.subnets) {
      vpc.subnetIds = [];
      for (const subnet of vpcDiscovery.subnets) {
        const subnetIds = await this.ec2Wrapper.getSubnetIds(vpcId, subnet.tagKey, subnet.tagValues);
        vpc.subnetIds = vpc.subnetIds.concat(subnetIds);
      }
      // remove duplicate elements from the array
      vpc.subnetIds = [...new Set(vpc.subnetIds)];
    }
    if (vpcDiscovery.securityGroups) {
      vpc.securityGroupIds = [];
      for (const group of vpcDiscovery.securityGroups) {
        const groupIds = await this.ec2Wrapper.getSecurityGroupIds(vpcId, group.names, group.tagKey, group.tagValues);
        vpc.securityGroupIds = vpc.securityGroupIds.concat(groupIds);
      }
      // remove duplicate elements from the array
      vpc.securityGroupIds = [...new Set(vpc.securityGroupIds)];
    }
    return vpc;
  }
}
