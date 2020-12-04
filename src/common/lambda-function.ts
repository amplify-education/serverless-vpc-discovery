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
      validateVPCDiscoveryConfig(funcVPCDiscovery);
    } catch (e) {
      Globals.logError(
        `The function '${funcName}' is not configured correctly: ${e}. VPC not configured. ` +
        "Please see the README for the proper setup.",
        true
      );
      return null;
    }

    return await this.ec2Wrapper.getVpcConfig(vpcDiscovery);
  }
}
