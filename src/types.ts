export interface VPC {
  subnetIds?: string[];
  securityGroupIds?: string[];
}

export interface VPCDiscovery {
  vpcName: string;
  subnetNames?: string[];
  securityGroupNames?: string[];
}

export interface FuncVPCDiscovery extends VPCDiscovery {
}

export interface ServerlessInstance {
  service: {
    service: string
    provider: {
      stage: string
      vpc: {},
    },
    functions: {
      name: {
        vpc: {
          subnetIds: {} | undefined,
          securityGroupIds: {} | undefined,
        },
        vpcDiscovery: FuncVPCDiscovery | boolean | undefined
      }
    },
    custom: {
      vpc: VPCDiscovery | undefined, // Deprecated
      vpcDiscovery: VPCDiscovery | undefined
    },
  };
  providers: {
    aws: {
      getCredentials (),
      getRegion (),
    },
  };
  cli: {
    log (str: string, entity?: string),
    consoleLog (str: any),
  };
}
