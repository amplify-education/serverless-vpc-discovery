import { VPCDiscovery } from "../../../src/types";
import yaml = require("js-yaml")
import fs = require("fs")

function readYml (path: string) {
  try {
    return yaml.safeLoad(fs.readFileSync(path, "utf8"));
  } catch (e) {
    console.log(e);
  }
}

/**
 * Read sls config and generate {name: vpcDiscovery config} collection
 * @returns {"test-sls-vpc-dicovery-test-helloWorld": {vpcName: ${env:TEST_VPC_NAME}, ...} }
 */
function readLambdaFunctions (configPath: string, vpcName: string, identifier: string) {
  const config = readYml(configPath);
  const serviceName = config.service.replace(/\${opt:RANDOM_STRING}/gi, identifier);
  const stage = config.provider.stage;
  const funcConf = {};
  for (const fName in config.functions) {
    const vpcConfig = config.functions[fName].vpcDiscovery;
    if (typeof vpcConfig !== "boolean" && vpcConfig) {
      Object.assign(vpcConfig, compileVPCConfig(vpcConfig, vpcName));
    }

    funcConf[`${serviceName}-${stage}-${fName}`] = vpcConfig;
  }

  return funcConf;
}

/**
 * Read basic sls VPC discovery config
 * @returns {"test-sls-vpc-dicovery-test-helloWorld": {vpcName: ${env:TEST_VPC_NAME}, ...} }
 */
function readBasicVPCConfig (configPath: string, vpcName: string) {
  const config = readYml(configPath);
  const vpcDiscovery = config.custom.vpcDiscovery;
  return compileVPCConfig(vpcDiscovery, vpcName);
}

/**
 * Update VPC discovery config with variables
 * @returns {vpcName: "test", ...}
 */
function compileVPCConfig (vpcDiscovery: VPCDiscovery, vpcName) {
  const regExp = /\${env:TEST_VPC_NAME}/gi;
  vpcDiscovery.vpcName = vpcDiscovery.vpcName.replace(regExp, vpcName);
  if (vpcDiscovery.subnetNames) {
    vpcDiscovery.subnetNames = vpcDiscovery.subnetNames.map((item) => {
      return item.replace(regExp, vpcName);
    });
  }
  if (vpcDiscovery.securityGroupNames) {
    vpcDiscovery.securityGroupNames = vpcDiscovery.securityGroupNames.map((item) => {
      return item.replace(regExp, vpcName);
    });
  }
  return vpcDiscovery;
}

export {
  readLambdaFunctions,
  readBasicVPCConfig
};
