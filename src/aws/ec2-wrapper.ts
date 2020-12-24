import { EC2 } from "aws-sdk";
import { getAWSPagedResults, getValueFromTags, wildcardMatches } from "../utils";

export class EC2Wrapper {
  public ec2: EC2

  constructor (credentials: any) {
    this.ec2 = new EC2(credentials);
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
      throw new Error(`VPC with tag key 'Name' and tag value '${vpcName}' does not exist.`);
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

    const missingSubnetValues = tagValues.filter((tagValue) => {
      // collect subnets by name
      const subnetsByName = subnets.filter((subnet) => {
        return wildcardMatches(tagValue, getValueFromTags(subnet.Tags, tagKey));
      });
      return subnetsByName.length === 0;
    });

    if (!subnets.length || missingSubnetValues.length) {
      throw new Error(
        `Subnets with vpc id '${vpcId}', tag key '${tagKey}' and tag values '${missingSubnetValues}' do not exist. ` +
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
    // init filter by vpc id
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
      const namesErrorText = names ? `, names '${names}'` : "";
      const tagErrorText = tagKey && tagValues ? `, tag key '${tagKey}' and tag values '${tagValues}'` : "";
      throw new Error(`Security groups with vpc id '${vpcId}'${namesErrorText}${tagErrorText} do not exist`);
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
        const groupsByName = securityGroups.filter((securityGroup) => {
          const groupTagValue = getValueFromTags(securityGroup.Tags, tagKey);
          return groupTagValue === tagValue;
        });
        return groupsByName.length === 0;
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
