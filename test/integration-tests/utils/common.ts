import yaml = require("js-yaml")
import fs = require("fs")

function readYml (path: string) {
  try {
    return yaml.safeLoad(fs.readFileSync(path, "utf8"))
  } catch (e) {
    console.log(e)
  }
}

function readLambdaFuncName (configPath: string, identifier: string) {
  const config = readYml(configPath)
  const serviceName = config.service.replace(/\${opt:RANDOM_STRING}/gi, identifier)
  const stage = config.provider.stage
  const funcName = Object.keys(config.functions)[0]
  return `${serviceName}-${stage}-${funcName}`
}

function readVPCConfig (configPath: string, vpcName: string) {
  const regExp = /\${env:TEST_VPC_NAME}/gi
  const config = readYml(configPath)
  const vpc = config.custom.vpc
  vpc.vpcName = vpc.vpcName.replace(regExp, vpcName)
  vpc.subnetNames = vpc.subnetNames.map(item => {
    return item.replace(regExp, vpcName)
  })
  vpc.securityGroupNames = vpc.securityGroupNames.map(item => {
    return item.replace(regExp, vpcName)
  })
  return vpc
}

export {
  readLambdaFuncName,
  readVPCConfig
}
