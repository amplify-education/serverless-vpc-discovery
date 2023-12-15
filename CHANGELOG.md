# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [5.0.0] - 2023-12-15

### Changed

- Moved from AWS SDK V1 to AWS SDK V3
- Speed up VPC config setup by caching

## [4.1.0] - 2023-03-09

### Changed

- Outdated packages updated
- Minimum node version updated to 14

## [4.0.2] - 2022-04-11

### Changed

- Add integration with serverless 3 logging
- Change Github workflows to run tests both with sls 2 and 3

## [4.0.1] - 2022-04-08

### Changed

- Fixed audit issues. Added dependabot config

## [4.0.0] - 2022-04-08

### Changed

- Added compability with serverless 3

## [3.1.2] - 2021-09-01

### Changed

- Fixed y18n vulnerability

## [3.1.1] - 2021-09-01

### Changed

- Added serverless schema validation. Thank you @ROSeaboyer ([53](https://github.com/amplify-education/serverless-vpc-discovery/pull/53))

## [3.1.0] - 2021-09-01

### Changed

- Dropped support of node versions < 12
- Replaced Travis pipeline items with GitHub workflow

## [3.0.0] - 2020-12-24

### Added

- Support for getting subnets and security groups by any tag key/value

### Changed

- ***Important!*** The `subnetNames` and `securityGroupNames` options have been deprecated and will be removed in the next major release. The new options are `subnets` and `securityGroups`.
- ***Important!*** Drop `vpc` option support. The new option is `vpcDiscovery`.

## [2.3.0] - 2020-12-11

### Changed

- Allow usage of wildcards in subnet and security group names. Thank you @RLRabinowitz ([#41](https://github.com/amplify-education/serverless-vpc-discovery/pull/41))

## [2.2.1] - 2020-12-02

### Changed

- Fixed travis build

## [2.2.0] - 2020-12-02

### Changed

- Set `custom.vpcDiscovery` optional.
- Update travis config for github release tagging

## [2.1.0] - 2020-11-17

### Changed

- ***Important!*** The `vpc` option has been deprecated but it still will work for a while. The new option is `vpcDiscovery`.
- The VPC config applies to each function instead of the provider option.
- Fixed logic for checking missing subnets and security groups.

### Added

- A possibility to specify custom config for each function by specifying `function.vpcDiscovery` config
- Added `warning` and `info` messages

## [2.0.0] - 2020-11-13

### Changed

- The code rewritten to TypeScript. Added improvements. Updated travis config, lint and test scripts.

## [1.0.13] - 2018-10-10

### Added

- Added our own configuration for AWS SDK's built in retry mechanism, increasing it from 3 retries to 20 so that this plugin is more easily used in an automated environment.

## [1.0.12] - 2018-08-01

### Added

- This CHANGELOG file to make it easier for future updates to be documented. Sadly, will not be going back to document changes made for previous versions.
