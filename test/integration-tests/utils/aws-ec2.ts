import Globals from "../../../src/globals";
import {
  DescribeSecurityGroupsCommand,
  DescribeSubnetsCommand,
  DescribeVpcsCommand,
  EC2Client
} from "@aws-sdk/client-ec2";

export default class EC2Wrap {
  private client: EC2Client;

  constructor (region: string) {
    this.client = new EC2Client({
      region,
      retryStrategy: Globals.getRetryStrategy()
    });
  }

  /**
   * Read VPC info
   * @param {string} vpcId
   * @return {string} VPC name
   */
  public async getVPCName (vpcId: string): Promise<string> {
    const response = await this.client.send(new DescribeVpcsCommand({ VpcIds: [vpcId] }));

    const vpc = response.Vpcs.length > 0 ? response.Vpcs[0] : null;
    if (vpc != null) {
      return vpc.Tags.filter((item) => item.Key === "Name")[0].Value;
    }

    return null;
  }

  /**
   * Gets VPC Subnets info by VPC id
   * @param vpcId - VPC id
   * @param subnetIds - list of subnet ids
   * @returns {data} - all information about the VPC Subnets
   */
  public async getSubnets (vpcId: string, subnetIds: string[]) {
    const response = await this.client.send(
      new DescribeSubnetsCommand({
        SubnetIds: subnetIds,
        Filters: [{ Name: "vpc-id", Values: [vpcId] }]
      })
    );

    return response.Subnets;
  }

  /**
   * Gets VPC security sroups info by VPC id
   * @param vpcId - VPC id
   * @param securityGroupIds - list of security group ids
   * @returns {data} - all information about the VPC Subnets
   */
  public async getSecurityGroups (vpcId: string, securityGroupIds: string[]) {
    const response = await this.client.send(
      new DescribeSecurityGroupsCommand({
        GroupIds: securityGroupIds,
        Filters: [{ Name: "vpc-id", Values: [vpcId] }]
      })
    );
    return response.SecurityGroups;
  }
}
