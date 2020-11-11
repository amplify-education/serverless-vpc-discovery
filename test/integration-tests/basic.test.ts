"use strict"

import "mocha"
import { expect } from "chai"
import { getRandomString, TEST_VPC_NAME } from "./base"
import * as execution from "./utils/execution"
import { getLambdaFunctionInfo, getVPCInfo, getSubnetsInfo, getSecurityGroupInfo } from "./utils/aws"
import { readLambdaFuncName, readVPCConfig } from "./utils/common"
import itParam = require("mocha-param")
import path = require("path")

const CONFIGS_FOLDER = "basic"
const TIMEOUT_MINUTES = 15 * 60 * 1000 // 15 minutes in milliseconds
const RANDOM_STRING = getRandomString()
const TEMP_DIR = `~/tmp/vpc-discovery-test-${RANDOM_STRING}`

const testCases = [{
  testDescription: "Basic example",
  testFolder: `${CONFIGS_FOLDER}/basic-example`
}]

describe("Integration Tests", function () {
  this.timeout(TIMEOUT_MINUTES)

  describe("Configuration Tests", () => {
    // @ts-ignore
    // eslint-disable-next-line no-template-curly-in-string
    itParam("${value.testDescription}", testCases, async (done, value) => {
      const slsConfig = path.join(__dirname, `${value.testFolder}/serverless.yml`)
      // Perform sequence of commands to replicate basepath mapping issue
      try {
        // prepare folder with npm packages and deploy
        await execution.createTempDir(TEMP_DIR, value.testFolder)
        await execution.slsDeploy(TEMP_DIR, RANDOM_STRING)

        // read lambda function name and vpc config from the serverless.yml
        const funcName = readLambdaFuncName(slsConfig, RANDOM_STRING)
        const slsVPCConfig = readVPCConfig(slsConfig, TEST_VPC_NAME)

        // get lambda function info
        const data = await getLambdaFunctionInfo(funcName)
        const lambdaVPCConfig = data.Configuration.VpcConfig

        // get vpc info by lambda vpc id and check names
        const vpc = await getVPCInfo(lambdaVPCConfig.VpcId)
        expect(slsVPCConfig.vpcName).to.equal(vpc.VpcName)

        // get vpc subnets info by lambda vpc id and subnets ids, check names
        const subnets = await getSubnetsInfo(lambdaVPCConfig.VpcId, lambdaVPCConfig.SubnetIds)
        const subnetNames = subnets.map(item => item.SubnetName).sort()
        expect(JSON.stringify(slsVPCConfig.subnetNames.sort())).to.equal(JSON.stringify(subnetNames))

        // get vpc security groups info by lambda vpc id and security groups ids, check names
        const securityGroups = await getSecurityGroupInfo(lambdaVPCConfig.VpcId, lambdaVPCConfig.SecurityGroupIds)
        const securityGroupNames = securityGroups.map(item => item.GroupName).sort()
        expect(JSON.stringify(slsVPCConfig.securityGroupNames.sort())).to.equal(JSON.stringify(securityGroupNames))
      } finally {
        done()
        await execution.slsRemove(TEMP_DIR, RANDOM_STRING)
      }
    })
  })
})
