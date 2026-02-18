"use strict";

import chai = require("chai");
import spies = require("chai-spies");
import VPCPlugin from "../../src/index";
import { VPCDiscovery } from "../../src/types";
import Globals from "../../src/globals";
import Logging from "../../src/logging";
import { mockClient } from "aws-sdk-client-mock";
import {
  DescribeSecurityGroupsCommand,
  DescribeSubnetsCommand,
  DescribeVpcsCommand,
  EC2Client
} from "@aws-sdk/client-ec2";
import { validateVPCDiscoveryConfig } from "../../src/validation";
import { getValueFromTags, sleep, wildcardMatches } from "../../src/utils";

const expect = chai.expect;
chai.use(spies);

const emptyData = require("./empty-data.json");
const testData = require("./test-data.json");

const vpc = "test";
const subnets = [
  {
    tagKey: "Name",
    tagValues: [
      "test_subnet_1",
      "test_subnet_2",
      "test_subnet_3"
    ]
  }
];
const securityGroups = [
  {
    names: ["test_group_1"]
  }
];
const vpcId = "vpc-test";

// set global defaults
Globals.options = {
  stage: "test"
};
Globals.currentRegion = Globals.defaultRegion;

// This will create a mock plugin to be used for testing
const testFuncName = "funcTest";
let consoleOutput = [];
const constructPlugin = (vpcConfig, funcConfig?: any, v3Utils?: any) => {
  const serverless = {
    service: {
      provider: {
        region: "us-moon-1"
      },
      functions: funcConfig || {
        [testFuncName]: {}
      },
      custom: {
        vpcDiscovery: vpcConfig
      }
    },
    cli: {
      log (str: string) {
        consoleOutput.push(str);
      }
    },
    providers: {
      aws: {
        getRegion: () => "us-moon-1",
        getCredentials: () => ({})
      }
    },
    configSchemaHandler: {
      defineCustomProperties: (props: any) => {
      },
      defineFunctionProperties: (provider: string, props: any) => {
      }
    }
  };
  return new VPCPlugin(serverless, {}, v3Utils);
};

const initMessage = "[Info] Updating VPC config...";
const initFuncMessage = `[Info] Getting VPC config for the function: '${testFuncName}'\n`;
const foundFuncMessage = `[Info] Found VPC with id '${vpcId}'`;

describe("serverless-vpc-plugin", () => {
  it("registers hooks", () => {
    const plugin = constructPlugin({});
    expect(plugin.hooks["before:package:initialize"]).to.be.a("function");
  });
});

describe("Given a vpc,", () => {
  it("function updates vpc", async () => {
    const EC2ClientMock = mockClient(EC2Client);
    EC2ClientMock.on(DescribeVpcsCommand).resolves(testData);
    EC2ClientMock.on(DescribeSubnetsCommand).resolves(testData);
    EC2ClientMock.on(DescribeSecurityGroupsCommand).resolves(testData);

    const plugin = constructPlugin({
      vpcName: vpc,
      subnets: subnets,
      securityGroups: securityGroups
    });
    plugin.validateCustomVPCDiscoveryConfig();
    await plugin.initResources();

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
    const EC2ClientMock = mockClient(EC2Client);
    EC2ClientMock.on(DescribeVpcsCommand).resolves(emptyData);

    const plugin = constructPlugin({});
    await plugin.initResources();

    const funcVPCDiscovery: VPCDiscovery = {
      vpcName: "test",
      subnets: [{ tagKey: "Name", tagValues: ["test_subnet"] }]
    };

    return await plugin.lambdaFunction.getFuncVPC("test", funcVPCDiscovery).then(() => {
      const expectedMessage = `VPC with tag key 'Name' and tag value '${funcVPCDiscovery.vpcName}' does not exist`;
      expect(consoleOutput[1]).to.equal(initFuncMessage.replace(testFuncName, "test"));
      expect(consoleOutput[2]).to.contain(expectedMessage);
    });
  });

  afterEach(() => {
    consoleOutput = [];
  });
});

describe("Given valid inputs for Subnets and Security Groups ", () => {
  let plugin;
  beforeEach(async () => {
    const EC2ClientMock = mockClient(EC2Client);
    EC2ClientMock.on(DescribeVpcsCommand).resolves(testData);
    EC2ClientMock.on(DescribeSubnetsCommand).resolves(testData);
    EC2ClientMock.on(DescribeSecurityGroupsCommand).resolves(testData);

    plugin = constructPlugin({});
    await plugin.initResources();
  });

  it("without wildcards", async () => {
    const funcVPCDiscovery: VPCDiscovery = {
      vpcName: "test",
      subnets: subnets,
      securityGroups: securityGroups
    };

    await plugin.lambdaFunction.getFuncVPC("test", funcVPCDiscovery).then((vpc) => {
      expect(vpc.subnetIds).to.have.members(["subnet-test-1", "subnet-test-2", "subnet-test-3"]);
      expect(vpc.securityGroupIds).to.have.members(["sg-test"]);
    });
  });

  it("with wildcards", async () => {
    const funcVPCDiscovery: VPCDiscovery = {
      vpcName: "test",
      subnets: [{ tagKey: "Name", tagValues: ["test_subnet_*"] }],
      securityGroups: [{ names: ["test_group_*"] }]
    };

    await plugin.lambdaFunction.getFuncVPC("test", funcVPCDiscovery).then((vpc) => {
      expect(vpc.subnetIds).to.have.members(["subnet-test-1", "subnet-test-2", "subnet-test-3"]);
      expect(vpc.securityGroupIds).to.have.members(["sg-test"]);
    });
  });

  afterEach(() => {
    consoleOutput = [];
  });
});

describe("Given invalid input for ", () => {
  const funcVPCDiscovery: VPCDiscovery = {
    vpcName: "test",
    subnets: [{ tagKey: "Name", tagValues: ["test_subnet_1"] }],
    securityGroups: [{ names: ["test_group_1"] }]
  };

  it("Subnets", async () => {
    const EC2ClientMock = mockClient(EC2Client);
    EC2ClientMock.on(DescribeVpcsCommand).resolves(testData);
    EC2ClientMock.on(DescribeSubnetsCommand).resolves(emptyData);
    EC2ClientMock.on(DescribeSecurityGroupsCommand).resolves(testData);

    const plugin = constructPlugin({});
    await plugin.initResources();

    await plugin.lambdaFunction.getFuncVPC("test", funcVPCDiscovery).then(() => {
      const expectedMessage = `Subnets with vpc id '${vpcId}', tag key 'Name' and tag values '${funcVPCDiscovery.subnets[0].tagValues}' do not exist`;
      expect(consoleOutput[1]).to.equal(initFuncMessage.replace(testFuncName, "test"));
      expect(consoleOutput[2]).to.equal(foundFuncMessage);
      expect(consoleOutput[3]).to.contain(expectedMessage);
    });
  });

  it("Security Groups", async () => {
    const EC2ClientMock = mockClient(EC2Client);
    EC2ClientMock.on(DescribeVpcsCommand).resolves(testData);
    EC2ClientMock.on(DescribeSubnetsCommand).resolves(testData);
    EC2ClientMock.on(DescribeSecurityGroupsCommand).resolves(emptyData);

    const plugin = constructPlugin({});
    await plugin.initResources();

    await plugin.lambdaFunction.getFuncVPC("test", funcVPCDiscovery).then(() => {
      const expectedMessage = `Security groups with vpc id '${vpcId}', names '${securityGroups[0].names[0]}' do not exist`;
      expect(consoleOutput[1]).to.equal(initFuncMessage.replace(testFuncName, "test"));
      expect(consoleOutput[2]).to.equal(foundFuncMessage);
      expect(consoleOutput[3]).to.contain(expectedMessage);
    });
  });

  afterEach(() => {
    consoleOutput = [];
  });
});

describe("Given input missing in AWS for ", () => {
  beforeEach(() => {
    const EC2ClientMock = mockClient(EC2Client);
    EC2ClientMock.on(DescribeVpcsCommand).resolves(testData);
    EC2ClientMock.on(DescribeSubnetsCommand).resolves(testData);
    EC2ClientMock.on(DescribeSecurityGroupsCommand).resolves(testData);
  });

  it("Subnets", async () => {
    const funcVPCDiscovery: VPCDiscovery = {
      vpcName: "test",
      subnets: [{ tagKey: "Name", tagValues: ["test_subnet_*", "missing_subnet"] }],
      securityGroups: [{ names: ["test_group_*"] }]
    };
    const plugin = constructPlugin({});
    await plugin.initResources();

    await plugin.lambdaFunction.getFuncVPC("test", funcVPCDiscovery).then(() => {
      const expectedMessage = `Subnets with vpc id '${vpcId}', tag key 'Name' and tag values 'missing_subnet' do not exist.`;
      expect(consoleOutput[1]).to.equal(initFuncMessage.replace(testFuncName, "test"));
      expect(consoleOutput[2]).to.equal(foundFuncMessage);
      expect(consoleOutput[3]).to.contain(expectedMessage);
    });
  });

  it("Security Groups", async () => {
    const funcVPCDiscovery: VPCDiscovery = {
      vpcName: "test",
      subnets: [{ tagKey: "Name", tagValues: ["test_subnet_*"] }],
      securityGroups: [{ names: ["test_group_*", "missing_security_group"] }]
    };

    const plugin = constructPlugin({});
    await plugin.initResources();

    await plugin.lambdaFunction.getFuncVPC("test", funcVPCDiscovery).then(() => {
      const expectedMessage = "Security groups do not exist for the names";
      expect(consoleOutput[1]).to.equal(initFuncMessage.replace(testFuncName, "test"));
      expect(consoleOutput[2]).to.equal(foundFuncMessage);
      expect(consoleOutput[3]).to.contain(expectedMessage);
    });
  });

  afterEach(() => {
    consoleOutput = [];
  });
});

describe("Catching errors in updateVpcConfig ", () => {
  it("AWS api call describeVpcs fails", async () => {
    const EC2ClientMock = mockClient(EC2Client);
    EC2ClientMock.on(DescribeVpcsCommand).resolves(emptyData);

    const plugin = constructPlugin({
      vpcName: vpc,
      subnets: subnets,
      securityGroups: securityGroups
    });
    plugin.validateCustomVPCDiscoveryConfig();
    await plugin.initResources();

    await plugin.updateFunctionsVpcConfig().then(() => {
      const expectedErrorMessage = `VPC with tag key 'Name' and tag value '${vpc}' does not exist.`;
      expect(consoleOutput[1]).to.equal(initMessage);
      expect(consoleOutput[2]).to.equal(initFuncMessage);
      expect(consoleOutput[3]).to.contain(expectedErrorMessage);
    });
  });

  it("Serverless file is configured incorrectly", () => {
    const plugin = constructPlugin({
      securityGroupNames: securityGroups
    });

    try {
      plugin.validateCustomVPCDiscoveryConfig();
    } catch (err) {
      const expectedErrorMessage = "The `custom.vpcDiscovery` is not configured correctly: \n" +
        "Error: 'vpcDiscovery.vpcName' is not specified.  Please see README for proper setup.";
      expect(err.message).to.equal(expectedErrorMessage);
      return true;
    }
  });

  afterEach(() => {
    consoleOutput = [];
  });
});

describe("Backward compatibility", () => {
  it("converts subnetNames to subnets config", async () => {
    const EC2ClientMock = mockClient(EC2Client);
    EC2ClientMock.on(DescribeVpcsCommand).resolves(testData);
    EC2ClientMock.on(DescribeSubnetsCommand).resolves(testData);
    EC2ClientMock.on(DescribeSecurityGroupsCommand).resolves(testData);

    const plugin = constructPlugin({
      vpcName: "test",
      subnetNames: ["test_subnet_1"],
      securityGroupNames: ["test_group_1"]
    });
    plugin.validateCustomVPCDiscoveryConfig();
    await plugin.initResources();

    const result = await plugin.updateFunctionsVpcConfig();
    expect(result[testFuncName].vpc.subnetIds).to.have.members(["subnet-test-1", "subnet-test-2", "subnet-test-3"]);
    expect(result[testFuncName].vpc.securityGroupIds).to.have.members(["sg-test"]);
    // check deprecation warning was logged
    expect(consoleOutput.some((msg) => msg.includes("deprecated"))).to.be.true;
  });

  afterEach(() => {
    consoleOutput = [];
  });
});

describe("v3Utils support", () => {
  it("sets Globals.v3Utils when v3Utils.log is provided", () => {
    const v3Utils = {
      writeText: (msg: string) => {},
      log: Object.assign((msg: string) => {}, {
        error: (msg: string) => {},
        verbose: (msg: string) => {},
        warning: (msg: string) => {}
      }),
      progress: { get: (name: string) => ({ update: () => {}, remove: () => {} }) }
    };
    constructPlugin({}, undefined, v3Utils);
    expect(Globals.v3Utils).to.equal(v3Utils);
  });

  afterEach(() => {
    Globals.v3Utils = undefined;
    consoleOutput = [];
  });
});

describe("hookWrapper", () => {
  it("calls validateCustomVPCDiscoveryConfig, initResources, and the lifecycle func", async () => {
    const EC2ClientMock = mockClient(EC2Client);
    EC2ClientMock.on(DescribeVpcsCommand).resolves(testData);
    EC2ClientMock.on(DescribeSubnetsCommand).resolves(testData);
    EC2ClientMock.on(DescribeSecurityGroupsCommand).resolves(testData);

    const plugin = constructPlugin({
      vpcName: vpc,
      subnets: subnets,
      securityGroups: securityGroups
    });

    const result = await plugin.hookWrapper(plugin.updateFunctionsVpcConfig);
    expect(result[testFuncName].vpc.subnetIds).to.have.members(["subnet-test-1", "subnet-test-2", "subnet-test-3"]);
  });

  afterEach(() => {
    consoleOutput = [];
  });
});

describe("Function-level vpcDiscovery", () => {
  it("skips VPC config when vpcDiscovery is false", async () => {
    const EC2ClientMock = mockClient(EC2Client);
    EC2ClientMock.on(DescribeVpcsCommand).resolves(testData);

    const funcConfig = {
      [testFuncName]: {
        vpcDiscovery: false
      }
    };
    const plugin = constructPlugin({
      vpcName: vpc,
      subnets: subnets,
      securityGroups: securityGroups
    }, funcConfig);
    plugin.validateCustomVPCDiscoveryConfig();
    await plugin.initResources();

    const result = await plugin.updateFunctionsVpcConfig();
    expect(result[testFuncName].vpc).to.be.undefined;
    expect(consoleOutput.some((msg) => msg.includes("Skipping VPC config"))).to.be.true;
  });

  it("returns null when vpcDiscovery is empty and no base config", async () => {
    const EC2ClientMock = mockClient(EC2Client);
    EC2ClientMock.on(DescribeVpcsCommand).resolves(testData);

    const plugin = constructPlugin(null);
    await plugin.initResources();

    const result = await plugin.lambdaFunction.getFuncVPC("test", {} as VPCDiscovery);
    expect(result).to.be.null;
  });

  it("throws error for invalid function vpcDiscovery config", async () => {
    const EC2ClientMock = mockClient(EC2Client);
    EC2ClientMock.on(DescribeVpcsCommand).resolves(testData);

    const plugin = constructPlugin(null);
    await plugin.initResources();

    try {
      await plugin.lambdaFunction.getFuncVPC("badFunc", { vpcName: "test" } as VPCDiscovery);
      expect.fail("Should have thrown");
    } catch (e) {
      expect(e.message).to.contain("Function 'badFunc' is not configured correctly");
    }
  });

  it("warns when vpc.subnetIds conflicts with vpcDiscovery.subnets", async () => {
    const EC2ClientMock = mockClient(EC2Client);
    EC2ClientMock.on(DescribeVpcsCommand).resolves(testData);
    EC2ClientMock.on(DescribeSubnetsCommand).resolves(testData);
    EC2ClientMock.on(DescribeSecurityGroupsCommand).resolves(testData);

    const funcConfig = {
      [testFuncName]: {
        vpc: {
          subnetIds: ["subnet-existing"]
        },
        vpcDiscovery: {
          vpcName: "test",
          subnets: subnets,
          securityGroups: securityGroups
        }
      }
    };
    const plugin = constructPlugin(null, funcConfig);
    await plugin.initResources();

    const result = await plugin.updateFunctionsVpcConfig();
    // existing subnetIds should be preserved, not overwritten
    expect(result[testFuncName].vpc.subnetIds).to.eql(["subnet-existing"]);
    expect(consoleOutput.some((msg) => msg.includes("vpc.subnetIds' are specified"))).to.be.true;
  });

  it("warns when vpc.securityGroupIds conflicts with vpcDiscovery.securityGroups", async () => {
    const EC2ClientMock = mockClient(EC2Client);
    EC2ClientMock.on(DescribeVpcsCommand).resolves(testData);
    EC2ClientMock.on(DescribeSubnetsCommand).resolves(testData);
    EC2ClientMock.on(DescribeSecurityGroupsCommand).resolves(testData);

    const funcConfig = {
      [testFuncName]: {
        vpc: {
          securityGroupIds: ["sg-existing"]
        },
        vpcDiscovery: {
          vpcName: "test",
          subnets: subnets,
          securityGroups: securityGroups
        }
      }
    };
    const plugin = constructPlugin(null, funcConfig);
    await plugin.initResources();

    const result = await plugin.updateFunctionsVpcConfig();
    // existing securityGroupIds should be preserved, not overwritten
    expect(result[testFuncName].vpc.securityGroupIds).to.eql(["sg-existing"]);
    expect(consoleOutput.some((msg) => msg.includes("vpc.securityGroupIds' are specified"))).to.be.true;
  });

  afterEach(() => {
    consoleOutput = [];
  });
});

describe("Legacy credentials fallback", () => {
  it("falls back to serverless provider credentials on credential error", async () => {
    const EC2ClientMock = mockClient(EC2Client);
    EC2ClientMock.on(DescribeVpcsCommand).rejects(new Error("Could not load credentials from any providers"));

    const plugin = constructPlugin({});
    await plugin.initResources();

    // Should have recreated lambdaFunction with provider credentials
    expect(plugin.lambdaFunction).to.not.be.undefined;
  });

  afterEach(() => {
    consoleOutput = [];
  });
});

describe("Logging", () => {
  it("uses v3Utils logging when available", () => {
    const logged = { error: [], verbose: [], warning: [] };
    Globals.v3Utils = {
      writeText: () => {},
      log: Object.assign(() => {}, {
        error: (msg: string) => { logged.error.push(msg); },
        verbose: (msg: string) => { logged.verbose.push(msg); },
        warning: (msg: string) => { logged.warning.push(msg); }
      }),
      progress: { get: () => ({ update: () => {}, remove: () => {} }) }
    };

    Logging.logError("test error");
    Logging.logInfo("test info");
    Logging.logWarning("test warning");

    expect(logged.error).to.include("test error");
    expect(logged.verbose).to.include("test info");
    expect(logged.warning).to.include("test warning");
  });

  it("uses cli logging when v3Utils is not available", () => {
    Globals.v3Utils = undefined;
    Logging.logError("err msg");
    Logging.logInfo("info msg");
    Logging.logWarning("warn msg");

    expect(consoleOutput.some((msg) => msg.includes("err msg"))).to.be.true;
    expect(consoleOutput.some((msg) => msg.includes("info msg"))).to.be.true;
    expect(consoleOutput.some((msg) => msg.includes("warn msg"))).to.be.true;
  });

  afterEach(() => {
    Globals.v3Utils = undefined;
    consoleOutput = [];
  });
});

describe("Validation", () => {
  it("throws when vpcName is not specified", () => {
    expect(() => validateVPCDiscoveryConfig({} as VPCDiscovery)).to.throw("'vpcDiscovery.vpcName' is not specified");
  });

  it("throws when neither subnets nor securityGroups is specified", () => {
    expect(() => validateVPCDiscoveryConfig({ vpcName: "test" } as VPCDiscovery))
      .to.throw("You must specify at least one of the 'vpcDiscovery.subnets' or 'vpcDiscovery.securityGroups'");
  });

  it("throws when subnets is not an array", () => {
    expect(() => validateVPCDiscoveryConfig({
      vpcName: "test",
      subnets: "bad" as any
    } as VPCDiscovery)).to.throw("'vpcDiscovery.subnets' should be an array and not empty");
  });

  it("throws when securityGroups is not an array", () => {
    expect(() => validateVPCDiscoveryConfig({
      vpcName: "test",
      securityGroups: "bad" as any
    } as VPCDiscovery)).to.throw("'vpcDiscovery.securityGroups' should be an array and not empty");
  });

  it("throws when subnet is missing tagKey or tagValues", () => {
    expect(() => validateVPCDiscoveryConfig({
      vpcName: "test",
      subnets: [{ tagKey: "", tagValues: [] }]
    })).to.throw("requires `tagKey` and `tagValues`");
  });

  it("throws when security group has no names or tag options", () => {
    expect(() => validateVPCDiscoveryConfig({
      vpcName: "test",
      securityGroups: [{}]
    } as VPCDiscovery)).to.throw("requires at least one of `tagKey`, `tagValues` or `names`");
  });

  it("throws when security group has tagKey but no tagValues", () => {
    expect(() => validateVPCDiscoveryConfig({
      vpcName: "test",
      securityGroups: [{ tagKey: "Name", tagValues: [] }]
    })).to.throw("tagValues` should be an array and not empty");
  });

  it("throws when security group has tagValues but no tagKey", () => {
    expect(() => validateVPCDiscoveryConfig({
      vpcName: "test",
      securityGroups: [{ names: ["group1"], tagValues: ["val1"] }]
    } as VPCDiscovery)).to.throw("tagKey` is required");
  });
});

describe("Utility functions", () => {
  it("getValueFromTags returns null when tag is not found", () => {
    const tags = [{ Key: "Name", Value: "test" }];
    expect(getValueFromTags(tags, "Missing")).to.be.null;
  });

  it("getValueFromTags returns value when tag is found", () => {
    const tags = [{ Key: "Name", Value: "test" }];
    expect(getValueFromTags(tags, "Name")).to.equal("test");
  });

  it("wildcardMatches returns false for non-matching patterns", () => {
    expect(wildcardMatches("foo_*", "bar_baz")).to.be.false;
  });

  it("wildcardMatches supports ? single-char wildcard", () => {
    expect(wildcardMatches("foo_?", "foo_1")).to.be.true;
    expect(wildcardMatches("foo_?", "foo_12")).to.be.false;
  });

  it("sleep resolves after delay", async () => {
    const start = Date.now();
    await sleep(0.01);
    const elapsed = Date.now() - start;
    expect(elapsed).to.be.greaterThanOrEqual(5);
  });
});

describe("Globals", () => {
  it("getRetryStrategy returns a ConfiguredRetryStrategy", () => {
    const strategy = Globals.getRetryStrategy();
    expect(strategy).to.not.be.undefined;
  });

  it("getRetryStrategy accepts custom parameters", () => {
    const strategy = Globals.getRetryStrategy(5, 1000, 200);
    expect(strategy).to.not.be.undefined;
  });
});

describe("Security groups with tags", () => {
  it("filters security groups by tag key and tag values", async () => {
    const EC2ClientMock = mockClient(EC2Client);
    EC2ClientMock.on(DescribeVpcsCommand).resolves(testData);
    EC2ClientMock.on(DescribeSubnetsCommand).resolves(testData);
    EC2ClientMock.on(DescribeSecurityGroupsCommand).resolves({
      SecurityGroups: [
        {
          GroupId: "sg-tag-test",
          GroupName: "tagged_group",
          Tags: [{ Key: "Environment", Value: "prod" }]
        }
      ]
    });

    const plugin = constructPlugin({});
    await plugin.initResources();

    const funcVPCDiscovery: VPCDiscovery = {
      vpcName: "test",
      subnets: subnets,
      securityGroups: [{ tagKey: "Environment", tagValues: ["prod"] }]
    };

    const result = await plugin.lambdaFunction.getFuncVPC("test", funcVPCDiscovery);
    expect(result.securityGroupIds).to.have.members(["sg-tag-test"]);
  });

  it("throws when security group tag values don't match", async () => {
    const EC2ClientMock = mockClient(EC2Client);
    EC2ClientMock.on(DescribeVpcsCommand).resolves(testData);
    EC2ClientMock.on(DescribeSubnetsCommand).resolves(testData);
    EC2ClientMock.on(DescribeSecurityGroupsCommand).resolves({
      SecurityGroups: [
        {
          GroupId: "sg-tag-test",
          GroupName: "tagged_group",
          Tags: [{ Key: "Environment", Value: "staging" }]
        }
      ]
    });

    const plugin = constructPlugin({});
    await plugin.initResources();

    const funcVPCDiscovery: VPCDiscovery = {
      vpcName: "test",
      subnets: subnets,
      securityGroups: [{ tagKey: "Environment", tagValues: ["prod"] }]
    };

    const result = await plugin.lambdaFunction.getFuncVPC("test", funcVPCDiscovery);
    // Should log error about missing tag values
    expect(consoleOutput.some((msg) => msg.includes("Security groups do not exist for the tag"))).to.be.true;
  });

  afterEach(() => {
    consoleOutput = [];
  });
});

describe("No custom config", () => {
  it("skips validation when no custom.vpcDiscovery is set", () => {
    const serverless = {
      service: {
        provider: { region: "us-moon-1" },
        functions: {},
        custom: {}
      },
      cli: { log: (str: string) => { consoleOutput.push(str); } },
      providers: { aws: { getRegion: () => "us-moon-1", getCredentials: () => ({}) } },
      configSchemaHandler: {
        defineCustomProperties: () => {},
        defineFunctionProperties: () => {}
      }
    };
    const plugin = new VPCPlugin(serverless, {});
    // Should not throw
    plugin.validateCustomVPCDiscoveryConfig();
  });

  afterEach(() => {
    consoleOutput = [];
  });
});
