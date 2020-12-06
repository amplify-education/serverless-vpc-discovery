import { throttledCall } from "../../../src/utils";
import aws = require("aws-sdk")

const AWS_PROFILE = process.env.AWS_PROFILE;
const credentials = new aws.SharedIniFileCredentials(
  { profile: AWS_PROFILE }
);
const REGION = "us-west-2";
const Lambda = new aws.Lambda({
  credentials: credentials,
  region: REGION
});

const EC2 = new aws.EC2({
  credentials: credentials,
  region: REGION
});

/**
 * Gets lambda function info
 * @param funcName - name of function
 * @param qualifier - Specify a version or alias to get details about a published version of the function.
 * @returns {data} - all information about a function
 */
async function getLambdaFunctionInfo (funcName: string, qualifier?: string) {
  if (qualifier === undefined) {
    qualifier = "$LATEST";
  }
  return await Lambda.getFunction({
    FunctionName: funcName,
    Qualifier: qualifier
  }).promise();
}

/**
 * Gets VPC info by VPC id
 * @param vpcId - VPC id
 * @returns {data} - all information about the VPC
 */
async function getVPCInfo (vpcId: string) {
  const response = await throttledCall(EC2, "describeVpcs", { VpcIds: [vpcId] });
  const vpc = response.Vpcs[0];
  const nameTag = vpc.Tags.filter((item) => item.Key === "Name")[0];
  vpc.VpcName = nameTag.Value;
  return vpc;
}

/**
 * Gets VPC Subnets info by VPC id
 * @param vpcId - VPC id
 * @param subnetIds - list of subnet ids
 * @returns {data} - all information about the VPC Subnets
 */
async function getSubnetsInfo (vpcId: string, subnetIds: string[]) {
  const response = await throttledCall(EC2, "describeSubnets", {
    SubnetIds: subnetIds,
    Filters: [
      { Name: "vpc-id", Values: [vpcId] }
    ]
  });

  return response.Subnets.map((item) => {
    const nameTag = item.Tags.filter((item) => item.Key === "Name")[0];
    item.SubnetName = nameTag.Value;
    return item;
  });
}

/**
 * Gets VPC security sroups info by VPC id
 * @param vpcId - VPC id
 * @param securityGroupIds - list of security group ids
 * @returns {data} - all information about the VPC Subnets
 */
async function getSecurityGroupInfo (vpcId: string, securityGroupIds: string[]) {
  const response = await throttledCall(EC2, "describeSecurityGroups", {
    GroupIds: securityGroupIds,
    Filters: [
      { Name: "vpc-id", Values: [vpcId] }
    ]
  });
  return response.SecurityGroups;
}

export {
  getLambdaFunctionInfo,
  getVPCInfo,
  getSubnetsInfo,
  getSecurityGroupInfo
};
