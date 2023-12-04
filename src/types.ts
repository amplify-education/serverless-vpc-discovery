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

export interface ServerlessInstance {
    service: {
        service: string
        provider: {
            stage: string,
            region?: string
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
            getCredentials(),
            getRegion(),
        },
    };
    configSchemaHandler: {
        defineCustomProperties(props: any),
        defineFunctionProperties(provider: string, props: any),
    };
    cli: {
        log(str: string, entity?: string),
        consoleLog(str: any),
    };
}

export interface ServerlessOptions {
    stage: string;
    region?: string;
}

interface ServerlessProgress {
    update(message: string): void

    remove(): void
}

export interface ServerlessProgressFactory {
    get(name: string): ServerlessProgress;
}

export interface ServerlessUtils {
    writeText: (message: string) => void,
    log: ((message: string) => void) & {
        error(message: string): void
        verbose(message: string): void
        warning(message: string): void
    }
    progress: ServerlessProgressFactory
}
