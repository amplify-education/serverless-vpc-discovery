"use strict";

import * as aws from "aws-sdk";
import * as AWS from "aws-sdk-mock";
import { expect } from "chai";
import VPCPlugin from "../../src/index";
import { FuncVPCDiscovery } from "../../src/types";

const emptyData = require("./empty-data.json");
const testData = require("./test-data.json");

// Used for changing what to test
const testCreds = {
  accessKeyId: "test_key",
  secretAccessKey: "test_secret",
  sessionToken: "test_session"
};
const vpc = "test";
const subnets = [
  "test_subnet_1",
  "test_subnet_2",
  "test_subnet_3"
];
const securityGroups = ["test_group_1"];
const vpcId = "vpc-test";

// This will create a mock plugin to be used for testing
const constructPlugin = (vpcConfig) => {
  const serverless = {
    service: {
      provider: {
        region: "us-moon-1"
      },
      functions: {
        funcTest: {}
      },
      custom: {
        vpcDiscovery: vpcConfig
      }
    },
    cli: {
      log () {
      }
    },
    providers: {
      aws: {
        getCredentials: () => new aws.Credentials(testCreds),
        getRegion: () => "us-moon-1"
      }
    }
  };
  return new VPCPlugin(serverless);
};

describe("serverless-vpc-plugin", () => {
  it("check aws config", () => {
    const plugin = constructPlugin({
      vpcName: vpc,
      subnetNames: subnets,
      securityGroupNames: securityGroups
    });
    plugin.initResources();

    expect(plugin.awsCredentials.accessKeyId).to.equal(testCreds.accessKeyId);
    expect(plugin.awsCredentials.sessionToken).to.equal(testCreds.sessionToken);
  });

  it("registers hooks", () => {
    const plugin = constructPlugin({});
    expect(plugin.hooks["before:package:initialize"]).to.be.a("function");
  });
});

describe("Given a vpc,", () => {
  it("function updates vpc", () => {
    AWS.mock("EC2", "describeVpcs", testData);
    AWS.mock("EC2", "describeSubnets", testData);
    AWS.mock("EC2", "describeSecurityGroups", testData);

    const plugin = constructPlugin({
      vpcName: vpc,
      subnetNames: subnets,
      securityGroupNames: securityGroups
    });
    plugin.validateCustomVPCDiscovery();
    plugin.initResources();

    const expectedResult = {
      funcTest: {
        vpc: {
          securityGroupIds: ["sg-test"],
          subnetIds: ["subnet-test-1", "subnet-test-2", "subnet-test-3"]
        }
      }
    };
    return plugin.updateFunctionsVpcConfig().then((data) => {
      expect(data).to.eql(expectedResult);
    });
  });

  it("vpc option given does not exist", () => {
    AWS.mock("EC2", "describeVpcs", emptyData);
    const plugin = constructPlugin({});
    plugin.initResources();

    const funcVPCDiscovery: FuncVPCDiscovery = {
      vpcName: "test",
      subnetNames: ["test_subnet"]
    };

    return plugin.lambdaFunction.getFuncVPC("test", funcVPCDiscovery).then(() => {
      throw new Error("No error thrown for invalid VPC options");
    }, (err) => {
      expect(err.message).to.equal("Invalid vpc name, it does not exist");
    });
  });

  afterEach(() => {
    AWS.restore();
  });
});

describe("Given valid inputs for ", () => {
  it("Subnets", () => {
    AWS.mock("EC2", "describeVpcs", testData);
    AWS.mock("EC2", "describeSecurityGroups", testData);
    AWS.mock("EC2", "describeSubnets", testData);

    const plugin = constructPlugin({});
    plugin.initResources();

    const funcVPCDiscovery: FuncVPCDiscovery = {
      vpcName: "test",
      subnetNames: ["test_subnet"],
      securityGroupNames: ["test_group"]
    };

    plugin.lambdaFunction.getFuncVPC("test", funcVPCDiscovery).then((vpc) => {
      expect(vpc.subnetIds).to.equal("subnet-test-1");
      expect(vpc.securityGroupIds).to.equal("sg-test");
    });
  });

  afterEach(() => {
    AWS.restore();
  });
});

describe("Given invalid input for ", () => {
  let plugin;
  beforeEach(() => {
    plugin = constructPlugin({});
    plugin.initResources();
  });

  const funcVPCDiscovery: FuncVPCDiscovery = {
    vpcName: "test",
    subnetNames: ["test_subnet"],
    securityGroupNames: ["test_group"]
  };

  it("Subnets", () => {
    AWS.mock("EC2", "describeSubnets", emptyData);

    plugin.lambdaFunction.getFuncVPC("test", funcVPCDiscovery).then(() => {
      throw new Error("Test has failed. Subnets were created with invalid inputs");
    }, (err) => {
      expect(err.message).to.equal("Invalid subnet name, it does not exist");
    });
  });

  it("Security Groups", () => {
    AWS.mock("EC2", "describeSecurityGroups", emptyData);
    plugin.lambdaFunction.getFuncVPC("test", funcVPCDiscovery).then(() => {
      throw new Error("Test has failed. Security Groups were created with invalid inputs");
    }, (err) => {
      expect(err.message).to.equal("Invalid security group name, it does not exist");
    });
  });

  afterEach(() => {
    AWS.restore();
  });
});

describe("Catching errors in updateVpcConfig ", () => {
  it("AWS api call describeVpcs fails", () => {
    AWS.mock("EC2", "describeVpcs", emptyData);

    const plugin = constructPlugin({
      vpcName: vpc,
      subnetNames: subnets,
      securityGroupNames: securityGroups
    });
    plugin.validateCustomVPCDiscovery();
    plugin.initResources();
    return plugin.updateFunctionsVpcConfig().then(() => {
      throw new Error("Test has failed. updateVpcConfig did not catch errors.");
    }, (err) => {
      const expectedErrorMessage = "Invalid vpc name, it does not exist";
      expect(err.message).to.equal(expectedErrorMessage);
      AWS.restore();
    });
  });

  it("Serverless file is configured incorrectly", () => {
    const plugin = constructPlugin({
      securityGroupNames: securityGroups
    });

    try {
      plugin.validateCustomVPCDiscovery();
    } catch (err) {
      const expectedErrorMessage = "The `custom.vpcDiscovery` is not configured correctly. " +
        "You must specify the vpcName and at least one of subnetNames or securityGroupNames. " +
        "Please see README for proper setup.";
      expect(err.message).to.equal(expectedErrorMessage);
      return true;
    }
  });
});
