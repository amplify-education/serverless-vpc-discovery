'use strict';

const AWS = require('aws-sdk');
const _ = require('underscore');

class VPCPlugin {
  constructor(serverless) {
    this.serverless = serverless;

    /* hooks are the acutal code that will run when called */
    this.hooks = {
      'before:package:initialize': this.updateVpcConfig.bind(this),
    };
  }

  /**
   * Gets the desired vpc with the designated subnets and security groups
   * that were set in serverless config file
   * @returns {Promise}
   */
  updateVpcConfig() {
    const awsCreds = this.serverless.providers.aws.getCredentials();

    AWS.config.update(awsCreds);
    AWS.config.update({
      maxRetries: 20,
    });

    this.ec2 = new AWS.EC2();

    this.serverless.cli.log('Updating VPC config...');
    const service = this.serverless.service;

    // Checks if the serverless file is setup correctly
    if (service.custom.vpc.vpcName == null || service.custom.vpc.subnetNames == null ||
      service.custom.vpc.securityGroupNames == null) {
      throw new Error('Serverless file is not configured correctly. Please see README for proper setup.');
    }


    // Returns the vpc with subnet and security group ids
    return this.getVpcId(service.custom.vpc.vpcName).then((vpcId) => {
      const promises = [
        this.getSubnetIds(vpcId, service.custom.vpc.subnetNames),
        this.getSecurityGroupIds(vpcId, service.custom.vpc.securityGroupNames),
      ];

      return (Promise.all(promises).then((values) => {
        // Checks to see if either subnets or security gropus returned nothing
        if (!values[0].length || !values[1].length) {
          throw new Error('Vpc was not set');
        }

        // Sets the serverless's vpc config
        service.provider.vpc = {
          subnetIds: values[0],
          securityGroupIds: values[1],
        };

        return service.provider.vpc;
      }));
    }).catch((err) => {
      throw new Error(`Could not set vpc config. Message: ${err}`);
    });
  }

  /**
   *  Returns the promise that contains the vpc-id
   * @param {string} vpcName
   * @returns {Promise.<string>}
   */
  getVpcId(vpcName) {
    const vpcParams = {
      Filters: [{
        Name: 'tag:Name',
        Values: [vpcName],
      }],
    };

    return this.ec2.describeVpcs(vpcParams).promise().then((data) => {
      // If it cannot find a vpc, vpc does not exist for that name
      if (data.Vpcs.length === 0) {
        throw new Error('Invalid vpc name, it does not exist');
      }
      return data.Vpcs[0].VpcId;
    });
  }

  /**
   * Returns the promise that contains the subnet IDs
   *
   * @param {string} vpcId
   * @param {string[]} subnetNames
   * @returns {Promise.<string[]>}
   */
  getSubnetIds(vpcId, subnetNames) {
    const paramsSubnet = {
      Filters: [{
        Name: 'vpc-id',
        Values: [vpcId],
      }, {
        Name: 'tag:Name',
        Values: subnetNames,
      }],
    };

    return this.ec2.describeSubnets(paramsSubnet).promise().then((data) => {
      if (data.Subnets.length === 0) {
        throw new Error('Invalid subnet name, it does not exist');
      }

      if (paramsSubnet.Filters[1].Values.length !== data.Subnets.length) {
        // Creates a list of the valid subnets
        const validSubnets = data.Subnets.reduce((accum, val) => {
          const nameTag = val.Tags.find(tag => tag.Key === 'Name');

          if (nameTag) {
            accum.push(nameTag.Value);
          }

          return accum;
        }, []);
        // Compares the valid subents with ones given to find invalid subnet names
        const missingSubnets = _.difference(paramsSubnet.Filters[1].Values, validSubnets);

        throw new Error(`Not all subnets were registered: ${missingSubnets}`);
      }
      const subnetIds = data.Subnets.map(obj => obj.SubnetId);

      return subnetIds;
    });
  }


  /**
   *  Returns the promise that contains the security group IDs
   * @param {string} vpcId
   * @param {string[]} securityGroupNames
   * @returns {Promise.<string[]>}
   */
  getSecurityGroupIds(vpcId, securityGroupNames) {
    const paramsSecurity = {
      Filters: [{
        Name: 'vpc-id',
        Values: [vpcId],
      }, {
        Name: 'tag:Name',
        Values: securityGroupNames,
      }],

    };

    return this.ec2.describeSecurityGroups(paramsSecurity).promise().then((data) => {
      if (data.SecurityGroups.length === 0) {
        throw new Error('Invalid security group name, it does not exist');
      }

      if (paramsSecurity.Filters[1].Values.length !== data.SecurityGroups.length) {
        const validGroups = data.SecurityGroups.reduce((accum, val) => {
          const nameTag = val.Tags.find(tag => tag.Key === 'Name');

          if (nameTag) {
            accum.push(nameTag.Value);
          }

          return accum;
        }, []);
        const missingGroups = _.difference(paramsSecurity.Filters[1].Values, validGroups);
        throw new Error(`Not all security group were registered: ${missingGroups}`);
      }

      const securityGroupIds = data.SecurityGroups.map(obj => obj.GroupId);

      return securityGroupIds;
    });
  }
}
module.exports = VPCPlugin;
