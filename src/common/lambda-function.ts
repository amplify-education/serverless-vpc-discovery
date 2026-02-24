import { EC2Wrapper } from "../aws/ec2-wrapper";
import { VPCDiscovery, VPC } from "../types";
import { isObjectEmpty } from "../utils";
import { validateVPCDiscoveryConfig } from "../validation";
import Logging from "../logging";
import { createHash } from "crypto";

export class LambdaFunction {
  public ec2Wrapper: EC2Wrapper;
  private readonly basicVPCDiscovery?: VPCDiscovery;
  private vpcIdsCache = {};
  private subnetsIdsCache = {};
  private SGIdsCache = {};

  constructor (credentials: any, basicVPCDiscovery: VPCDiscovery) {
    this.ec2Wrapper = new EC2Wrapper(credentials);
    this.basicVPCDiscovery = basicVPCDiscovery;
  }

  /**
   * Validate and return VPC config for the given function
   * @returns {Promise<VPC>}
   */
  public async getFuncVPC (funcName: string, funcVPCDiscovery: VPCDiscovery): Promise<VPC> {
    if (typeof funcVPCDiscovery === "boolean" && !funcVPCDiscovery) {
      // skip vpc setup for `vpcDiscovery=false` option
      Logging.logInfo(`Skipping VPC config for the function '${funcName}'`);
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
      Logging.logInfo(`Getting VPC config for the function: '${funcName}'\n`);
      return await this.getVpcConfig(vpcDiscovery);
    } catch (e) {
      Logging.logError(`Function '${funcName}' VPC not configured based on the error: ${e}`);
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
    const vpcId = await this.getVPCId(vpcDiscovery.vpcName);
    Logging.logInfo(`Found VPC with id '${vpcId}'`);

    if (vpcDiscovery.subnets) {
      vpc.subnetIds = [];
      for (const subnet of vpcDiscovery.subnets) {
        const subnetIds = await this.getVPCSubnets(vpcId, subnet.tagKey, subnet.tagValues);
        vpc.subnetIds = vpc.subnetIds.concat(subnetIds);
      }
      // remove duplicate elements from the array
      vpc.subnetIds = [...new Set(vpc.subnetIds)];
    }
    if (vpcDiscovery.securityGroups) {
      vpc.securityGroupIds = [];
      for (const group of vpcDiscovery.securityGroups) {
        const groupIds = await this.getVPCSecurityGroups(vpcId, group.names, group.tagKey, group.tagValues);
        vpc.securityGroupIds = vpc.securityGroupIds.concat(groupIds);
      }
      // remove duplicate elements from the array
      vpc.securityGroupIds = [...new Set(vpc.securityGroupIds)];
    }
    return vpc;
  }

  /**
   * Get the VPC id from cache or read from AWS
   * @returns {Promise<object>}
   */
  private async getVPCId (vpcName: string) {
    if (this.vpcIdsCache[vpcName] === undefined) {
      this.vpcIdsCache[vpcName] = await this.ec2Wrapper.getVpcId(vpcName);
    }
    return this.vpcIdsCache[vpcName];
  }

  /**
   * Get the subnet ids from cache or read from AWS
   * @returns {Promise<object>}
   */
  private async getVPCSubnets (vpcId: string, tagKey: string, tagValues: string[]) {
    const hash = createHash("md5").update(vpcId + tagKey + tagValues.join()).digest("hex");
    if (!this.subnetsIdsCache[hash]) {
      this.subnetsIdsCache[hash] = await this.ec2Wrapper.getSubnetIds(vpcId, tagKey, tagValues);
    }
    return this.subnetsIdsCache[hash];
  }

  /**
   * Get the security group ids from cache or read from AWS
   * @returns {Promise<object>}
   */
  private async getVPCSecurityGroups (vpcId: string, names: string[], tagKey: string, tagValues: string[]) {
    const hash = createHash("md5").update(vpcId + (names || []).join() + tagKey + (tagValues || []).join()).digest("hex");
    if (!this.SGIdsCache[hash]) {
      this.SGIdsCache[hash] = await this.ec2Wrapper.getSecurityGroupIds(vpcId, names, tagKey, tagValues);
    }
    return this.SGIdsCache[hash];
  }
}
