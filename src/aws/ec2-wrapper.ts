import { EC2 } from "aws-sdk";
import { getAWSPagedResults, wildcardMatches } from "../utils";
import { VPC, VPCDiscovery } from "../types";

export class EC2Wrapper {
  public ec2: EC2

  constructor (credentials: any) {
    this.ec2 = new EC2(credentials);
  }

  /**
   * Gets the desired vpc with the designated subnets and security groups
   * that were set in serverless config file
   * @returns {Promise<object>}
   */
  public async getVpcConfig (vpcDiscovery: VPCDiscovery): Promise<VPC> {
    const vpc: VPC = {};
    const vpcId = await this.getVpcId(vpcDiscovery.vpcName);
    if (vpcDiscovery.subnetNames) {
      vpc.subnetIds = await this.getSubnetIds(vpcId, vpcDiscovery.subnetNames);
    }
    if (vpcDiscovery.securityGroupNames) {
      vpc.securityGroupIds = await this.getSecurityGroupIds(vpcId, vpcDiscovery.securityGroupNames);
    }
    return vpc;
  }

  /**
   *  Returns the promise that contains the vpc-id
   * @param {string} vpcName
   * @returns {Promise.<string>}
   */
  public async getVpcId (vpcName: string): Promise<string> {
    const params = {
      Filters: [{
        Name: "tag:Name",
        Values: [vpcName]
      }]
    };
    const vpcItems = await getAWSPagedResults(
      this.ec2,
      "describeVpcs",
      "Vpcs",
      "NextToken",
      "NextToken",
      params
    );
    if (vpcItems.length === 0) {
      throw new Error("Invalid vpc name, it does not exist");
    }
    return vpcItems[0].VpcId;
  }

  /**
   * Returns the promise that contains the subnet IDs
   *
   * @param {string} vpcId
   * @param {string[]} subnetNames
   * @returns {Promise.<string[]>}
   */
  public async getSubnetIds (vpcId: string, subnetNames: string[]): Promise<string[]> {
    const params = {
      Filters: [{
        Name: "vpc-id",
        Values: [vpcId]
      }, {
        Name: "tag:Name",
        Values: subnetNames
      }]
    };

    const subnets = await getAWSPagedResults(
      this.ec2,
      "describeSubnets",
      "Subnets",
      "NextToken",
      "NextToken",
      params
    );

    if (subnets.length === 0) {
      throw new Error("Invalid subnet name, it does not exist");
    }

    const missingSubnetNames = subnetNames.filter((subnetName) => {
      // collect subnets by name
      const subnetsByName = subnets.filter((subnet) => {
        const nameTag = subnet.Tags.find((tag) => tag.Key === "Name");
        return wildcardMatches(subnetName, nameTag.Value);
      });
      return subnetsByName.length === 0;
    });

    if (missingSubnetNames.length) {
      throw new Error(
        `Subnets do not exist for the names: ${missingSubnetNames}. ` +
        "Please check the names are correct or remove it."
      );
    }

    return subnets.map((subnet) => subnet.SubnetId);
  }

  /**
   *  Returns the promise that contains the security group IDs
   * @param {string} vpcId
   * @param {string[]} securityGroupNames
   * @returns {Promise.<string[]>}
   */
  public async getSecurityGroupIds (vpcId: string, securityGroupNames: string[]): Promise<string[]> {
    const params = {
      Filters: [{
        Name: "vpc-id",
        Values: [vpcId]
      }, {
        Name: "group-name",
        Values: securityGroupNames
      }]
    };
    const securityGroups = await getAWSPagedResults(
      this.ec2,
      "describeSecurityGroups",
      "SecurityGroups",
      "NextToken",
      "NextToken",
      params
    );

    if (securityGroups.length === 0) {
      throw new Error("Invalid security group name, it does not exist");
    }

    const missingGroupsNames = securityGroupNames.filter((groupName) => {
      // collect security groups by name
      const securityGroupsByName = securityGroups.filter((securityGroup) => {
        return wildcardMatches(groupName, securityGroup.GroupName);
      });
      return securityGroupsByName.length === 0;
    });

    if (missingGroupsNames.length) {
      throw new Error(
        `Security groups do not exist for the names: ${missingGroupsNames}. ` +
        "Please check the names are correct or remove it."
      );
    }

    return securityGroups.map((group) => group.GroupId);
  }
}
