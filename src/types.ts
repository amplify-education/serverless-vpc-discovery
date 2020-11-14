export interface VPC {
  subnetIds: string[] | undefined;
  securityGroupIds: string[] | undefined;
}

export interface VPCDiscovery {
  vpcName: string;
  subnetNames: string[] | undefined;
  securityGroupNames: string[] | undefined;
}

export interface FuncVPCDiscovery extends VPCDiscovery {
  disabled: boolean
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
        vpcDiscovery: FuncVPCDiscovery | undefined
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
