export interface SubnetItem {
  tagKey: string;
  tagValues: string[];
}

export interface SecurityGroupItem {
  tagKey?: string;
  tagValues?: string[];
  names?: string[];
}

export interface VPCDiscovery {
  vpcName: string;
  subnets?: SubnetItem[];
  securityGroups?: SecurityGroupItem[];
  // for supporting back compatibility
  subnetNames?: string[];
  securityGroupNames?: string[];
}

export interface FuncVPCDiscovery extends VPCDiscovery {
}

export interface VPC {
  subnetIds?: string[];
  securityGroupIds?: string[];
}

export interface ServerlessLog {
  error (message: string): void;
  warning (message: string): void;
  notice (message: string): void;
  info (message: string): void;
  debug (message: string): void;
}

export interface ServerlessProgressOptions {
  message: string;
}

export interface ServerlessProgressInstance {
  update (message: string): void;
  remove (): void;
}

export interface ServerlessProgress {
  create (options: ServerlessProgressOptions): ServerlessProgressInstance;
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
      vpcDiscovery: VPCDiscovery | undefined
    },
  };
  providers: {
    aws: {
      getCredentials (),
      getRegion (),
    },
  };
  configSchemaHandler: {
    defineCustomProperties (props: any),
    defineFunctionProperties (provider: string, props: any),
  };
  cli: {
    log (str: string, entity?: string),
    consoleLog (str: any),
  };
}
