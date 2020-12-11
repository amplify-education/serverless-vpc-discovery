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
    if (vpcDiscovery.subnets) {
      const subnets = vpcDiscovery.subnets;
      vpc.subnetIds = await this.getSubnetIds(vpcId, subnets.tagKey, subnets.tagValues);
    }
    if (vpcDiscovery.securityGroups) {
      const groups = vpcDiscovery.securityGroups;
      vpc.securityGroupIds = await this.getSecurityGroupIds(vpcId, groups.names, groups.tagKey, groups.tagValues);
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
   * @param {string} tagKey
   * @param {string[]} tagValues
   * @returns {Promise.<string[]>}
   */
  public async getSubnetIds (vpcId: string, tagKey: string, tagValues: string[]): Promise<string[]> {
    const params = {
      Filters: [{
        Name: "vpc-id",
        Values: [vpcId]
      }, {
        Name: `tag:${tagKey}`,
        Values: tagValues
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
      throw new Error("Invalid input for the subnets, it does not exist");
    }

    const missingSubnetValues = tagValues.filter((tagValue) => {
      // collect subnets by name
      const subnetsByName = subnets.filter((subnet) => {
        const nameTag = subnet.Tags.find((tag) => tag.Key === tagKey);
        return wildcardMatches(tagValue, nameTag.Value);
      });
      return subnetsByName.length === 0;
    });

    if (missingSubnetValues.length) {
      throw new Error(
        `Subnets do not exist for the tag '${tagKey}' and tag values: '${missingSubnetValues}'. ` +
        "Please check the `tagKey` and `tagValues` are correct or remove it."
      );
    }

    return subnets.map((subnet) => subnet.SubnetId);
  }

  /**
   *  Returns the promise that contains the security group IDs
   * @param {string} vpcId
   * @param {string[]} names
   * @param {string[]} tagKey
   * @param {string[]} tagValues
   * @returns {Promise.<string[]>}
   */
  public async getSecurityGroupIds (vpcId: string, names?: string[], tagKey?: string, tagValues?: string[]): Promise<string[]> {
    // init filter just by vpc id
    const params = { Filters: [{ Name: "vpc-id", Values: [vpcId] }] };
    // update filters with names if specified
    if (names) {
      params.Filters.push({ Name: "group-name", Values: names });
    }
    // update filters with tag and values if specified
    if (tagKey && tagValues) {
      params.Filters.push({ Name: `tag:${tagKey}`, Values: tagValues });
    }
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

    if (names) {
      const missingGroupsNames = names.filter((groupName) => {
        // collect security groups by name
        const securityGroupsByName = securityGroups.filter((securityGroup) => {
          return wildcardMatches(groupName, securityGroup.GroupName);
        });
        return securityGroupsByName.length === 0;
      });

      if (missingGroupsNames.length) {
        throw new Error(
          `Security groups do not exist for the names: ${missingGroupsNames}. ` +
          "Please check the 'names' are correct or remove it."
        );
      }
    }

    if (tagKey && tagValues) {
      tagValues = tagValues || [];
      const missingGroupsTagNames = tagValues.filter((tagValue) => {
        // collect subnets by name
        const subnetsByName = securityGroups.filter((securityGroup) => {
          const nameTag = securityGroup.Tags.find((tag) => tag.Key === tagKey);
          return nameTag.Value === tagValue;
        });
        return subnetsByName.length === 0;
      });
      if (missingGroupsTagNames.length) {
        throw new Error(
          `Security groups do not exist for the tag '${tagKey}' and tag values: '${missingGroupsTagNames}'. ` +
          "Please check the 'tagKey' and 'tagValues' are correct or remove it."
        );
      }
    }

    return securityGroups.map((group) => group.GroupId);
  }
}
