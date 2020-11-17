import { EC2Wrapper } from "../aws/ec2-wrapper";
import { VPCDiscovery, FuncVPCDiscovery, VPC } from "../types";
import Globals from "../globals";

export class LambdaFunction {
  private ec2Wrapper: EC2Wrapper;
  private readonly basicVPCDiscovery: VPCDiscovery;

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
    const isConfigValid = this.validateVPCDiscovery(funcVPCDiscovery);
    if (isConfigValid) {
      // inherit basic config
      const vpcDiscovery = Object.assign({}, this.basicVPCDiscovery, funcVPCDiscovery);
      return await this.ec2Wrapper.getVpcConfig(vpcDiscovery);
    }

    Globals.logWarning(
      `The function '${funcName}' is not configured correctly. ` +
      "Please see README for proper setup. The basic vpc config are applied"
    );

    return await this.ec2Wrapper.getVpcConfig(this.basicVPCDiscovery);
  }

  /**
   * Validate function vpc discovery config
   * @returns {boolean}
   */
  public validateVPCDiscovery (funcVPCDiscovery: FuncVPCDiscovery): boolean {
    if (funcVPCDiscovery) {
      // check is vpcDiscovery correct
      const isSubnetsAndGroups = funcVPCDiscovery.subnetNames != null || funcVPCDiscovery.securityGroupNames != null;
      return funcVPCDiscovery.vpcName != null && isSubnetsAndGroups;
    }
    return true;
  }
}
