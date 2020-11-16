import { EC2 } from "aws-sdk";
import { getAWSPagedResults } from "../utils";

class EC2Wrapper {
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
        return nameTag.Value === subnetName;
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
      // collect subnets by name
      const securityGroupsByName = securityGroups.filter((securityGroup) => {
        return securityGroup.GroupName === groupName;
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

export = EC2Wrapper
