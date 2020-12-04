import { FuncVPCDiscovery, SecurityGroupItem, SubnetItem, VPCDiscovery } from "./types";

/**
 * Validate vpc discovery subnets config
 * @param subnets - the `SubnetItem` options
 * @returns
 */
function validateVPCSubnets (subnets: SubnetItem) {
  // The `subnets` should have `tagKey` and `tagValues`
  if (!subnets.tagKey || !subnets.tagValues || !subnets.tagValues.length) {
    throw new Error(
      "The `vpcDiscovery.subnets` requires `tagKey`, `tagValues` options and it should not be empty."
    );
  }
}

/**
 * Validate vpc discovery securityGroups config
 * @param securityGroups - the `SecurityGroupItem` options
 * @returns
 */
function validateVPCSecurityGroups (securityGroups: SecurityGroupItem) {
  if (!securityGroups.names && (!securityGroups.tagKey || !securityGroups.tagValues)) {
    throw new Error(
      "The `vpcDiscovery.securityGroups` requires at least one of `tagKey`, `tagValues` or `names` option(s) " +
      "and it should not be empty."
    );
  }
  if (securityGroups.tagKey && (!securityGroups.tagValues || !securityGroups.tagValues.length)) {
    throw new Error("The `vpcDiscovery.securityGroups.tagValues` should not be empty.");
  }
  if (securityGroups.tagValues && !securityGroups.tagKey) {
    throw new Error("The `vpcDiscovery.securityGroups.tagValues` should not be empty.");
  }
}

/**
 * Validate vpc discovery config
 * @param vpcDiscovery - the `custom.VPCDiscovery` or func VPCDiscovery
 * @returns
 */
function validateVPCDiscoveryConfig (vpcDiscovery: VPCDiscovery | FuncVPCDiscovery): void {
  // `vpcName` is required
  if (vpcDiscovery.vpcName == null) {
    throw new Error("The `vpcDiscovery.vpcName` is not specified.");
  }
  // at least one of the `subnets` or `securityGroups` is required
  if (!vpcDiscovery.subnets && !vpcDiscovery.securityGroups) {
    throw new Error("You must specify at least one of the `vpcDiscovery.subnets` or `vpcDiscovery.securityGroups`.");
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
