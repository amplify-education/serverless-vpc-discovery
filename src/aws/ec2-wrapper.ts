import { EC2 } from "aws-sdk"
import { getAWSPagedResults } from "../utils"

class EC2Wrapper {
  public ec2: EC2

  constructor (credentials: any) {
    this.ec2 = new EC2(credentials)
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
    }
    const vpcs = await getAWSPagedResults(
      this.ec2,
      "describeVpcs",
      "Vpcs",
      "NextToken",
      "NextToken",
      params
    )
    if (vpcs.length === 0) {
      throw new Error("Invalid vpc name, it does not exist")
    }
    return vpcs[0].VpcId
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
    }

    const subnets = await getAWSPagedResults(
      this.ec2,
      "describeSubnets",
      "Subnets",
      "NextToken",
      "NextToken",
      params
    )

    if (subnets.length === 0) {
      throw new Error("Invalid subnet name, it does not exist")
    }

    const missingSubnets = subnets.filter((subnet) => {
      const nameTag = subnet.Tags.find(tag => tag.Key === "Name")
      return subnetNames.indexOf(nameTag.Value) === -1
    })

    if (missingSubnets.length) {
      throw new Error(`Not all subnets were registered: ${missingSubnets}`)
    }

    return subnets.map(subnet => subnet.SubnetId)
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
    }
    const securityGroups = await getAWSPagedResults(
      this.ec2,
      "describeSecurityGroups",
      "SecurityGroups",
      "NextToken",
      "NextToken",
      params
    )

    if (securityGroups.length === 0) {
      throw new Error("Invalid security group name, it does not exist")
    }

    const missingGroups = securityGroups.filter((group) => {
      return securityGroupNames.indexOf(group.GroupName) === -1
    })

    if (missingGroups.length) {
      throw new Error(`Not all security group were registered: ${missingGroups}`)
    }

    return securityGroups.map(group => group.GroupId)
  }
}

export {
  EC2Wrapper
}
