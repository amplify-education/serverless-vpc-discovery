"use strict";

import "mocha";
import { expect } from "chai";
import { RANDOM_STRING, TEMP_DIR, TEST_VPC_NAME } from "./base";
import * as execution from "./utils/execution";
import { readBasicVPCConfig, readLambdaFunctions } from "./utils/common";
import itParam = require("mocha-param")
import path = require("path")
import LambdaWrap from "./utils/aws-lambda";
import EC2Wrap from "./utils/aws-ec2";

const CONFIGS_FOLDER = "basic";
const TIMEOUT_MINUTES = 30 * 60 * 1000; // 30 minutes in milliseconds

const REGION = "us-west-2";
const lambdaClient = new LambdaWrap(REGION);
const ec2Client = new EC2Wrap(REGION);

const testCases = [
  {
    testDescription: "Basic example",
    testFolder: `${CONFIGS_FOLDER}/basic-example`
  },
  {
    testDescription: "Multi tag",
    testFolder: `${CONFIGS_FOLDER}/multi-tag`
  },
  {
    testDescription: "No basic VPC config",
    testFolder: `${CONFIGS_FOLDER}/only-functions`
  }
];

describe("Integration Tests", function () {
  this.timeout(TIMEOUT_MINUTES);

  // @ts-ignore
  // eslint-disable-next-line no-template-curly-in-string
  itParam("${value.testDescription}", testCases, async (value) => {
    const slsConfig = path.join(__dirname, `${value.testFolder}/serverless.yml`);

    // read basic vpcDiscovery config
    const basicVPCDiscovery = readBasicVPCConfig(slsConfig, TEST_VPC_NAME);
    // read lambda func names and func vpc configs from the serverless.yml
    const funcConfigs = readLambdaFunctions(slsConfig, TEST_VPC_NAME, RANDOM_STRING);
    // prepare folder with npm packages and deploy
    await execution.createTempDir(TEMP_DIR, value.testFolder);
    try {
      await execution.slsDeploy(TEMP_DIR);

      // eslint-disable-next-line guard-for-in
      for (const funcName in funcConfigs) {
        console.log(funcName);
        const funcVPCDiscovery = funcConfigs[funcName];
        // get lambda function info
        const data = await lambdaClient.getLambdaFunctionInfo(funcName);
        const lambdaVPCConfig = data.Configuration.VpcConfig;

        if (typeof funcVPCDiscovery === "boolean" && !funcVPCDiscovery) {
          // for option `func.vpcDiscovery: false` it shouldn't be vpc config
          expect(lambdaVPCConfig).to.equal(undefined);
        } else {
          // check vpcDiscovery config
          const vpcId = lambdaVPCConfig ? lambdaVPCConfig.VpcId : null;
          // inherit basic config if exist else empty for further checks
          const emptyVPCDiscovery = { vpcName: null, subnets: [], securityGroups: [] };
          const vpcDiscovery = Object.assign({}, emptyVPCDiscovery, basicVPCDiscovery, funcVPCDiscovery);

          // get vpc info by lambda vpc id and check names
          const vpcName = vpcId ? await ec2Client.getVPCName(vpcId) : null;
          console.log(vpcId, vpcName, vpcDiscovery.vpcName);
          expect(vpcDiscovery.vpcName).to.equal(vpcName);

          for (const discoverySubnet of vpcDiscovery.subnets) {
            // get vpc subnets info by lambda vpc id and subnets ids, check names
            const subnets = vpcId ? await ec2Client.getSubnets(vpcId, lambdaVPCConfig.SubnetIds) : [];

            let tagValues = [];
            subnets.forEach((item) => {
              // filter out tag items by vpcDiscovery subnets tag key
              const tagItems = item.Tags.filter((item) => item.Key === discoverySubnet.tagKey);
              // get tag value and update tagValues list
              tagValues = tagValues.concat(tagItems.map((item) => item.Value));
            });
            expect(JSON.stringify(discoverySubnet.tagValues.sort())).to.equal(JSON.stringify(tagValues.sort()));
          }

          for (const discoveryGroup of vpcDiscovery.securityGroups) {
            // get vpc security groups info by lambda vpc id and security groups ids, check names
            console.log(vpcId, lambdaVPCConfig.SecurityGroupIds);
            const securityGroups = vpcId ? await ec2Client.getSecurityGroups(vpcId, lambdaVPCConfig.SecurityGroupIds) : [];
            console.log(securityGroups);
            if (discoveryGroup.names) {
              // collect all security groups names
              const securityGroupNames = securityGroups.map((item) => item.GroupName).sort();
              console.log(securityGroupNames, discoveryGroup.names);
              // check that all discoveryGroup.names are in the list
              const allExist = discoveryGroup.names.every((name) => securityGroupNames.includes(name));
              expect(allExist).to.equal(true);
            }

            if (discoveryGroup.tagKey && discoveryGroup.tagValues) {
              let tagValues = [];
              securityGroups.forEach((item) => {
                // filter out tag items by vpcDiscovery subnets tag key
                const tagItems = item.Tags.filter((item) => item.Key === discoveryGroup.tagKey);
                // get tag value and update tagValues list
                tagValues = tagValues.concat(tagItems.map((item) => item.Value));
              });
              expect(JSON.stringify(discoveryGroup.tagValues.sort())).to.equal(JSON.stringify(tagValues.sort()));
            }
          }
        }
      }
    } finally {
      await execution.slsRemove(TEMP_DIR);
    }
  });
});
