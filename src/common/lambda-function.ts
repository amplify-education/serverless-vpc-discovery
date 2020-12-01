import { EC2Wrapper } from "../aws/ec2-wrapper";
import { VPCDiscovery, FuncVPCDiscovery, VPC } from "../types";
import Globals from "../globals";
import { isObjectEmpty } from "../utils";

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
      Globals.logInfo(`Skip the VPC config for function '${funcName}'`);
      return null;
    }
    // inherit the `custom.vpcDiscovery`
    const vpcDiscovery = Object.assign({}, this.basicVPCDiscovery, funcVPCDiscovery);
    // return null in case vpcDiscovery not setup
    if (isObjectEmpty(vpcDiscovery)) {
      return null;
    }
    // validate vpcDiscovery config
    const isConfigValid = this.validateVPCDiscovery(vpcDiscovery);
    if (!isConfigValid) {
      // skip vpc setup for not valid config
      Globals.logWarning(
        `The function '${funcName}' is not configured correctly. Skip the VPC config.` +
        "Please see the README for the proper setup."
      );
      return null;
    }

    return await this.ec2Wrapper.getVpcConfig(vpcDiscovery);
  }

  /**
   * Validate function vpc discovery config
   * @returns {boolean}
   */
  public validateVPCDiscovery (funcVPCDiscovery: FuncVPCDiscovery): boolean {
    if (funcVPCDiscovery) {
      // check is vpcDiscovery correct
      const isSubnetsOrGroups = funcVPCDiscovery.subnetNames != null || funcVPCDiscovery.securityGroupNames != null;
      return funcVPCDiscovery.vpcName != null && isSubnetsOrGroups;
    }
    return true;
  }
}
