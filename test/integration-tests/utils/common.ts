import { ServerlessService, VPCDiscovery } from "../../../src/types";
import yaml = require("js-yaml");
import fs = require("fs");

function readYml (path: string) {
  try {
    return <ServerlessService>yaml.load(fs.readFileSync(path, "utf8"));
  } catch (e) {
    console.log(e);
  }
}

/**
 * Read sls config and generate {name: vpcDiscovery config} collection
 * @returns {"test-sls-vpc-discovery-test-helloWorld": {vpcName: ${env:TEST_VPC_NAME}, ...} }
 */
function readLambdaFunctions (configPath: string, vpcName: string, identifier: string) {
  const config = readYml(configPath);
  const serviceName = (config.service || "").replace(/\${env:RANDOM_STRING}/gi, identifier);
  const stage = config.provider.stage;
  const funcConf = {};

  Object.keys(config.functions).forEach((fName) => {
    const vpcConfig = config.functions[fName].vpcDiscovery;
    if (typeof vpcConfig !== "boolean" && vpcConfig) {
      Object.assign(vpcConfig, compileVPCConfig(vpcConfig, vpcName));
    }

    funcConf[`${serviceName}-${stage}-${fName}`] = vpcConfig;
  });

  return funcConf;
}

/**
 * Read basic sls VPC discovery config
 * @returns {"test-sls-vpc-discovery-test-helloWorld": {vpcName: ${env:TEST_VPC_NAME}, ...} }
 */
function readBasicVPCConfig (configPath: string, vpcName: string) {
  const config = readYml(configPath);
  if (!config.custom || !config.custom.vpcDiscovery) {
    return null;
  }
  return compileVPCConfig(config.custom.vpcDiscovery, vpcName);
}

/**
 * Update VPC discovery config with variables
 * @returns {vpcName: "test", ...}
 */
function compileVPCConfig (vpcDiscovery: VPCDiscovery, vpcName) {
  const regExp = /\${env:TEST_VPC_NAME}/gi;
  vpcDiscovery.vpcName = vpcDiscovery.vpcName.replace(regExp, vpcName);

  if (vpcDiscovery.subnets) {
    vpcDiscovery.subnets = vpcDiscovery.subnets.map((item) => {
      item.tagKey.replace(regExp, vpcName);
      item.tagValues = item.tagValues.map((value) => {
        return value.replace(regExp, vpcName);
      });
      return item;
    });
  }

  if (vpcDiscovery.securityGroups) {
    vpcDiscovery.securityGroups = vpcDiscovery.securityGroups.map((item) => {
      if (item.names) {
        item.names = item.names.map((name) => {
          return name.replace(regExp, vpcName);
        });
      }
      if (item.tagKey) {
        item.tagKey.replace(regExp, vpcName);
      }
      if (item.tagValues) {
        item.tagValues = item.tagValues.map((value) => {
          return value.replace(regExp, vpcName);
        });
      }
      return item;
    });
  }
  return vpcDiscovery;
}

export {
  readLambdaFunctions,
  readBasicVPCConfig
};
