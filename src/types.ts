export interface VPC {
    vpcName: string;
    subnetNames: string[] | undefined;
    securityGroupNames: string[] | undefined;
}

export interface ServerlessInstance {
    service: {
        service: string
        provider: {
            stage: string
            vpc: {},
        }
        custom: {
            vpc: VPC | undefined
        },
    };
    providers: {
        aws: {
            getCredentials(),
            getRegion(),
        },
    };
    cli: {
        log(str: string, entity?: string),
        consoleLog(str: any),
    };
}
