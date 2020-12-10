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
  it("function updates vpc", async () => {
    AWS.mock("EC2", "describeVpcs", testData);
    AWS.mock("EC2", "describeSubnets", testData);
    AWS.mock("EC2", "describeSecurityGroups", testData);

    const plugin = constructPlugin({
      vpcName: vpc,
      subnetNames: subnets,
      securityGroupNames: securityGroups
    });
    plugin.validateCustomVPCDiscoveryConfig();
    plugin.initResources();

    const expectedResult = {
      funcTest: {
        vpc: {
          securityGroupIds: ["sg-test"],
          subnetIds: ["subnet-test-1", "subnet-test-2", "subnet-test-3"]
        }
      }
    };
    return await plugin.updateFunctionsVpcConfig().then((data) => {
      expect(data).to.eql(expectedResult);
    });
  });

  it("vpc option given does not exist", async () => {
    AWS.mock("EC2", "describeVpcs", emptyData);
    const plugin = constructPlugin({});
    plugin.initResources();

    const funcVPCDiscovery: FuncVPCDiscovery = {
      vpcName: "test",
      subnetNames: ["test_subnet"]
    };

    return await plugin.lambdaFunction.getFuncVPC("test", funcVPCDiscovery).then(() => {
      throw new Error("No error thrown for invalid VPC options");
    }, (err) => {
      expect(err.message).to.equal("Invalid vpc name, it does not exist");
    });
  });

  afterEach(() => {
    AWS.restore();
  });
});

describe("Given valid inputs for Subnets and Security Groups ", () => {
  let plugin;
  beforeEach(() => {
    AWS.mock("EC2", "describeVpcs", testData);
    AWS.mock("EC2", "describeSecurityGroups", testData);
    AWS.mock("EC2", "describeSubnets", testData);

    plugin = constructPlugin({});
    plugin.initResources();
  })

  it("without wildcards", async () => {
    const funcVPCDiscovery: FuncVPCDiscovery = {
      vpcName: "test",
      subnetNames: ["test_subnet_1", "test_subnet_2", "test_subnet_3"],
      securityGroupNames: ["test_group_1"]
    };

    await plugin.lambdaFunction.getFuncVPC("test", funcVPCDiscovery).then((vpc) => {
      expect(vpc.subnetIds).to.have.members(["subnet-test-1", "subnet-test-2", "subnet-test-3"]);
      expect(vpc.securityGroupIds).to.have.members(["sg-test"]);
    });
  });

  it("with wildcards", async () => {
    const funcVPCDiscovery: FuncVPCDiscovery = {
      vpcName: "test",
      subnetNames: ["test_subnet_*"],
      securityGroupNames: ["test_group_*"]
    };

    await plugin.lambdaFunction.getFuncVPC("test", funcVPCDiscovery).then((vpc) => {
      expect(vpc.subnetIds).to.have.members(["subnet-test-1", "subnet-test-2", "subnet-test-3"]);
      expect(vpc.securityGroupIds).to.have.members(["sg-test"]);
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

    AWS.mock("EC2", "describeVpcs", testData);
  });

  const funcVPCDiscovery: FuncVPCDiscovery = {
    vpcName: "test",
    subnetNames: ["test_subnet_1"],
    securityGroupNames: ["test_group_1"]
  };

  it("Subnets", async () => {
    AWS.mock("EC2", "describeSecurityGroups", testData);
    AWS.mock("EC2", "describeSubnets", emptyData);
    plugin.initResources();

    await plugin.lambdaFunction.getFuncVPC("test", funcVPCDiscovery).then(() => {
      throw new Error("Test has failed. Subnets were created with invalid inputs");
    }, (err) => {
      expect(err.message).to.equal("Invalid subnet name, it does not exist");
    });
  });

  it("Security Groups", async () => {
    AWS.mock("EC2", "describeSecurityGroups", emptyData);
    AWS.mock("EC2", "describeSubnets", testData);
    plugin.initResources();

    await plugin.lambdaFunction.getFuncVPC("test", funcVPCDiscovery).then(() => {
      throw new Error("Test has failed. Security Groups were created with invalid inputs");
    }, (err) => {
      expect(err.message).to.equal("Invalid security group name, it does not exist");
    });
  });

  afterEach(() => {
    AWS.restore();
  });
});

describe("Given input missing in AWS for ", () => {
  let plugin;
  beforeEach(() => {
    AWS.mock("EC2", "describeVpcs", testData);
    AWS.mock("EC2", "describeSubnets", testData);
    AWS.mock("EC2", "describeSecurityGroups", testData);

    plugin = constructPlugin({});
    plugin.initResources();
  });

  const funcVPCDiscovery: FuncVPCDiscovery = {
    vpcName: "test",
    subnetNames: ["test_subnet_*"],
    securityGroupNames: ["test_group_*"]
  };

  it('Subnets', async () => {
    const funcVPCDiscovery: FuncVPCDiscovery = {
      vpcName: "test",
      subnetNames: ["test_subnet_*", "missing_subnet"],
      securityGroupNames: ["test_group_*"]
    };

    await plugin.lambdaFunction.getFuncVPC("test", funcVPCDiscovery).then(() => {
      throw new Error("Test has failed. Security Groups were created with invalid inputs");
    }, (err) => {
      expect(err.message).to.equal("Subnets do not exist for the names: missing_subnet. Please check the names are correct or remove it.");
    });
  })

  it('Security Groups', async () => {
    const funcVPCDiscovery: FuncVPCDiscovery = {
      vpcName: "test",
      subnetNames: ["test_subnet_*"],
      securityGroupNames: ["test_group_*", "missing_security_group"]
    };

    await plugin.lambdaFunction.getFuncVPC("test", funcVPCDiscovery).then(() => {
      throw new Error("Test has failed. Security Groups were created with invalid inputs");
    }, (err) => {
      expect(err.message).to.equal("Security groups do not exist for the names: missing_security_group. Please check the names are correct or remove it.");
    });
  })

  afterEach(() => {
    AWS.restore();
  });
})

describe("Catching errors in updateVpcConfig ", () => {
  it("AWS api call describeVpcs fails", async () => {
    AWS.mock("EC2", "describeVpcs", emptyData);

    const plugin = constructPlugin({
      vpcName: vpc,
      subnetNames: subnets,
      securityGroupNames: securityGroups
    });
    plugin.validateCustomVPCDiscoveryConfig();
    plugin.initResources();
    return await plugin.updateFunctionsVpcConfig().then(() => {
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
      plugin.validateCustomVPCDiscoveryConfig();
    } catch (err) {
      const expectedErrorMessage = "The `custom.vpcDiscovery` is not configured correctly. " +
        "You must specify the vpcName and at least one of subnetNames or securityGroupNames. " +
        "Please see README for proper setup.";
      expect(err.message).to.equal(expectedErrorMessage);
      return true;
    }
  });
});
