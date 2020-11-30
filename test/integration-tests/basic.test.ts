"use strict";

import "mocha";
import { expect } from "chai";
import { getRandomString, TEST_VPC_NAME } from "./base";
import * as execution from "./utils/execution";
import { getLambdaFunctionInfo, getVPCInfo, getSubnetsInfo, getSecurityGroupInfo } from "./utils/aws";
import { readBasicVPCConfig, readLambdaFunctions } from "./utils/common";
import itParam = require("mocha-param")
import path = require("path")

const CONFIGS_FOLDER = "basic";
const TIMEOUT_MINUTES = 15 * 60 * 1000; // 15 minutes in milliseconds
const RANDOM_STRING = getRandomString();
const TEMP_DIR = `~/tmp/vpc-discovery-test-${RANDOM_STRING}`;

const testCases = [
  {
    testDescription: "Basic example",
    testFolder: `${CONFIGS_FOLDER}/basic-example`
  }, {
    testDescription: "No basic VPC config",
    testFolder: `${CONFIGS_FOLDER}/only-functions`
  }
];

describe("Integration Tests", function () {
  this.timeout(TIMEOUT_MINUTES);
  // @ts-ignore
  // eslint-disable-next-line no-template-curly-in-string
  itParam("${value.testDescription}", testCases, async (done, value) => {
    const slsConfig = path.join(__dirname, `${value.testFolder}/serverless.yml`);

    // read basic vpcDiscovery config
    const slsBasicVPCConfig = readBasicVPCConfig(slsConfig, TEST_VPC_NAME);
    // read lambda func names and func vpc configs from the serverless.yml
    const funcConfigs = readLambdaFunctions(slsConfig, TEST_VPC_NAME, RANDOM_STRING);
    try {
      // prepare folder with npm packages and deploy
      await execution.createTempDir(TEMP_DIR, value.testFolder);
      await execution.slsDeploy(TEMP_DIR, RANDOM_STRING);

      for (const funcName in funcConfigs) {
        const vpcDiscovery = funcConfigs[funcName];
        // get lambda function info
        const data = await getLambdaFunctionInfo(funcName);
        const lambdaVPCConfig = data.Configuration.VpcConfig;

        if (typeof vpcDiscovery === "boolean" && !vpcDiscovery) {
          // for option `func.vpcDiscovery: false` it shouldn't be vpc config
          expect(lambdaVPCConfig).to.equal(undefined);
        } else {
          // check vpcDiscovery config
          const vpcConfig = Object.assign({}, slsBasicVPCConfig, vpcDiscovery);

          // get vpc info by lambda vpc id and check names
          const vpc = await getVPCInfo(lambdaVPCConfig.VpcId);
          expect(vpcConfig.vpcName).to.equal(vpc.VpcName);

          // get vpc subnets info by lambda vpc id and subnets ids, check names
          const subnets = await getSubnetsInfo(lambdaVPCConfig.VpcId, lambdaVPCConfig.SubnetIds);
          const subnetNames = subnets.map((item) => item.SubnetName).sort();
          expect(JSON.stringify(vpcConfig.subnetNames.sort())).to.equal(JSON.stringify(subnetNames));

          // get vpc security groups info by lambda vpc id and security groups ids, check names
          const securityGroups = await getSecurityGroupInfo(lambdaVPCConfig.VpcId, lambdaVPCConfig.SecurityGroupIds);
          const securityGroupNames = securityGroups.map((item) => item.GroupName).sort();
          expect(JSON.stringify(vpcConfig.securityGroupNames.sort())).to.equal(JSON.stringify(securityGroupNames));
        }
      }
    } finally {
      done();
      await execution.slsRemove(TEMP_DIR, RANDOM_STRING);
    }
  });
});
