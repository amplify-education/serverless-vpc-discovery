'use strict';

const chai = require('chai');
const AWS = require('aws-sdk-mock');
const aws = require('aws-sdk');
const testData = require('./test-data.json');
const emptyData = require('./empty-data.json');
const VPCPlugin = require('../index.js');

const expect = chai.expect;

// Used for changing what to test
const testCreds = {
  accessKeyId: 'test_key',
  secretAccessKey: 'test_secret',
  sessionToken: 'test_session',
};
const vpc = 'ci';
const subnets = [
  'test_subnet_1',
  'test_subnet_2',
  'test_subnet_3',
  'common_name',
];
const securityGroups = ['test_group_1', 'common_name'];
const vpcId = 'vpc-test';

// This will create a mock plugin to be used for testing
const constructPlugin = (vpcConfig) => {
  const serverless = {
    service: {
      provider: {
        region: 'us-moon-1',
      },
      custom: {
        vpc: vpcConfig,
      },
    },
    cli: {
      log() {
      },
    },
    providers: {
      aws: {
        getCredentials: () => new aws.Credentials(testCreds),
      },
    },
  };
  return new VPCPlugin(serverless);
};

describe('serverless-vpc-plugin', () => {
  it('check aws config', () => {
    AWS.mock('EC2', 'describeVpcs', testData);
    AWS.mock('EC2', 'describeSubnets', testData);
    AWS.mock('EC2', 'describeSecurityGroups', testData);

    const plugin = constructPlugin({
      vpcName: vpc,
      subnetNames: subnets,
      securityGroupNames: securityGroups,
    });

    plugin.updateVpcConfig();
    const returnedCreds = plugin.ec2.config.credentials;
    expect(returnedCreds.accessKeyId).to.equal(testCreds.accessKeyId);
    expect(returnedCreds.sessionToken).to.equal(testCreds.sessionToken);
  });

  it('registers hooks', () => {
    const plugin = constructPlugin({});
    expect(plugin.hooks['before:package:initialize']).to.be.a('function');
  });
});


describe('Given a vpc,', () => {
  it('function updates vpc', () => {
    AWS.mock('EC2', 'describeVpcs', testData);
    AWS.mock('EC2', 'describeSubnets', testData);
    AWS.mock('EC2', 'describeSecurityGroups', testData);

    const plugin = constructPlugin({
      vpcName: vpc,
      subnetNames: subnets,
      securityGroupNames: securityGroups,
    });

    return plugin.updateVpcConfig().then((data) => {
      expect(data).to.eql({
        securityGroupIds: ['sg-test', 'sg-test2', 'sg-test3'],
        subnetIds: ['subnet-test-1', 'subnet-test-2', 'subnet-test-3', 'subnet-test-4', 'subnet-test-5'],
      });
    });
  });

  it('vpc option given does not exist', () => {
    AWS.mock('EC2', 'describeVpcs', emptyData);
    const plugin = constructPlugin({});
    plugin.ec2 = new aws.EC2();

    return plugin.getVpcId('not_a_vpc_name').then(() => {
      throw new Error('No error thrown for invalid VPC options');
    }, (err) => {
      expect(err.message).to.equal('Invalid vpc name, it does not exist');
    });
  });

  afterEach(() => {
    AWS.restore();
  });
});

describe('Given valid inputs for ', () => {
  let plugin;

  beforeEach(() => {
    AWS.mock('EC2', 'describeVpcs', testData);
    AWS.mock('EC2', 'describeSecurityGroups', testData);
    AWS.mock('EC2', 'describeSubnets', testData);
    plugin = constructPlugin({});
    plugin.ec2 = new aws.EC2();
  });

  it('Subnets', () => plugin.getSubnetIds(vpcId, subnets).then((data) => {
    expect(data[0]).to.equal('subnet-test-1');
  }));

  it('Security Groups', () => plugin.getSecurityGroupIds(vpcId, securityGroups).then((data) => {
    expect(data[0]).to.equal('sg-test');
  }));

  afterEach(() => {
    AWS.restore();
  });
});

describe('Given invalid input for ', () => {
  let plugin;
  beforeEach(() => {
    AWS.mock('EC2', 'describeSecurityGroups', emptyData);
    AWS.mock('EC2', 'describeSubnets', emptyData);
    plugin = constructPlugin({}, {});
    plugin.ec2 = new aws.EC2();
  });

  it('Subnets', () => plugin.getSubnetIds(vpcId, ['not_a_subnet']).then(() => {
    throw new Error('Test has failed. Subnets were created with invalid inputs');
  }, (err) => {
    expect(err.message).to.equal('Invalid subnet name, it does not exist');
  }));

  it('Security Groups', () => plugin.getSecurityGroupIds(vpcId, ['not_a_security']).then(() => {
    throw new Error('Test has failed. Security Groups were created with invalid inputs');
  }, (err) => {
    expect(err.message).to.equal('Invalid security group name, it does not exist');
  }));

  afterEach(() => {
    AWS.restore();
  });
});

describe('Catching errors in updateVpcConfig ', () => {
  it('AWS api call describeVpcs fails', () => {
    AWS.mock('EC2', 'describeVpcs', emptyData);

    const plugin = constructPlugin({
      vpcName: vpc,
      subnetNames: subnets,
      securityGroupNames: securityGroups,
    });
    return plugin.updateVpcConfig().then(() => {
      throw new Error('Test has failed. updateVpcConfig did not catch errors.');
    }, (err) => {
      const expectedErrorMessage = 'Could not set vpc config. Message: Error: Invalid vpc name, it does not exist';
      expect(err.message).to.equal(expectedErrorMessage);
      AWS.restore();
    });
  });

  it('Serverless file is configured incorrectly', () => {
    const plugin = constructPlugin({
      securityGroupNames: securityGroups,
    });

    try {
      return plugin.updateVpcConfig().then(() => {
        throw new Error('Test has failed. updateVpcConfig did not catch errors.');
      });
    } catch (err) {
      const expectedErrorMessage = 'Serverless file is not configured correctly. Please see README for proper setup.';
      expect(err.message).to.equal(expectedErrorMessage);
      return true;
    }
  });
});
