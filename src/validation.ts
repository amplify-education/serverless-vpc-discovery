import { FuncVPCDiscovery, SecurityGroupItem, SubnetItem, VPCDiscovery } from "./types";

/**
 * Validate vpc discovery subnets config
 * @param subnets - the `SubnetItem` options
 * @returns
 */
function validateVPCSubnets (subnets: SubnetItem[]) {
  subnets.forEach((subnet) => {
    // The `subnets` should have `tagKey` and `tagValues`
    if (!subnet.tagKey || !Array.isArray(subnet.tagValues) || !subnet.tagValues.length) {
      throw new Error(
        "The `vpcDiscovery.subnets` requires `tagKey` and `tagValues` options. " +
        "The `tagValues` should be an array and not empty."
      );
    }
  });
}

/**
 * Validate vpc discovery securityGroups config
 * @param securityGroups - the `SecurityGroupItem` options
 * @returns
 */
function validateVPCSecurityGroups (securityGroups: SecurityGroupItem[]) {
  securityGroups.forEach((securityGroup) => {
    if (!securityGroup.names && (!securityGroup.tagKey || !securityGroup.tagValues)) {
      throw new Error(
        "The `vpcDiscovery.securityGroups` requires at least one of `tagKey`, `tagValues` or `names` option(s). " +
        "The `names` and `tagValues` should be arrays and not empty."
      );
    }
    if (securityGroup.tagKey && (!Array.isArray(securityGroup.tagValues) || !securityGroup.tagValues.length)) {
      throw new Error("The `vpcDiscovery.securityGroups.tagValues` should be an array and not empty.");
    }
    if (securityGroup.tagValues && !securityGroup.tagKey) {
      throw new Error("The `vpcDiscovery.securityGroups.tagKey` is required.");
    }
  });
}

/**
 * Validate vpc discovery config
 * @param vpcDiscovery - the `custom.VPCDiscovery` or func VPCDiscovery
 * @returns
 */
function validateVPCDiscoveryConfig (vpcDiscovery: VPCDiscovery | FuncVPCDiscovery): void {
  // `vpcName` is required
  if (vpcDiscovery.vpcName == null) {
    throw new Error("'vpcDiscovery.vpcName' is not specified.");
  }
  // at least one of the `subnets` or `securityGroups` is required
  if (!vpcDiscovery.subnets && !vpcDiscovery.securityGroups) {
    throw new Error("You must specify at least one of the 'vpcDiscovery.subnets' or 'vpcDiscovery.securityGroups'.");
  }

  if (vpcDiscovery.subnets && (!Array.isArray(vpcDiscovery.subnets || !vpcDiscovery.subnets.length))) {
    throw new Error("'vpcDiscovery.subnets' should be an array and not empty.");
  }

  if (vpcDiscovery.securityGroups && (!Array.isArray(vpcDiscovery.securityGroups || !vpcDiscovery.securityGroups.length))) {
    throw new Error("'vpcDiscovery.securityGroups' should be an array and not empty.");
  }

  if (vpcDiscovery.subnets) {
    validateVPCSubnets(vpcDiscovery.subnets);
  }

  if (vpcDiscovery.securityGroups) {
    validateVPCSecurityGroups(vpcDiscovery.securityGroups);
  }
}

export {
  validateVPCDiscoveryConfig
};
