# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [8.0.0] - 2026-02-24

### Changed

- Dropped Node 20.x support
- Updated packages

## [7.0.0] - 2026-02-20

### Changed

- Dropped Node 18.x support
- Updated packages

## [7.0.0] - 2026-02-18

### Changed

- Dropped Node 16.x support
- Updated dependencies and fixed compatibility. Thank you @throberto ([#88](https://github.com/amplify-education/serverless-vpc-discovery/pull/88))

## [6.0.0] - 2024-11-25

### Changed

- Dropped Node 14.x support
- Updated packages

## [5.0.2] - 2024-01-19

### Fixed

- Fixed EC2 client credentials initialization

## [5.0.1] - 2024-01-19

### Changed

- Updated credentials initialization

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

- Added integration with serverless 3 logging
- Changed GitHub workflows to run tests both with sls 2 and 3

## [4.0.1] - 2022-04-08

### Changed

- Fixed audit issues. Added dependabot config

## [4.0.0] - 2022-04-08

### Changed

- Added compatibility with serverless 3

## [3.1.2] - 2021-09-01

### Changed

- Fixed y18n vulnerability

## [3.1.1] - 2021-09-01

### Changed

- Added serverless schema validation. Thank you @ROSeaboyer ([53](https://github.com/amplify-education/serverless-vpc-discovery/pull/53))

## [3.1.0] - 2021-09-01

### Changed

- Dropped support for Node versions < 12
- Replaced Travis pipeline items with GitHub workflow

## [3.0.0] - 2020-12-24

### Added

- Support for getting subnets and security groups by any tag key/value

### Changed

- ***Important!*** The `subnetNames` and `securityGroupNames` options have been deprecated and will be removed in the next major release. The new options are `subnets` and `securityGroups`.
- ***Important!*** Drop `vpc` option support. The new option is `vpcDiscovery`.

## [2.3.0] - 2020-12-11

### Changed

- Allowed usage of wildcards in subnet and security group names. Thank you @RLRabinowitz ([#41](https://github.com/amplify-education/serverless-vpc-discovery/pull/41))

## [2.2.1] - 2020-12-02

### Changed

- Fixed travis build

## [2.2.0] - 2020-12-02

### Changed

- Set `custom.vpcDiscovery` optional.
- Updated Travis config for GitHub release tagging

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

- Rewrote code to TypeScript. Added improvements. Updated Travis config, lint, and test scripts.

## [1.0.13] - 2018-10-10

### Added

- Added our own configuration for AWS SDK's built-in retry mechanism, increasing it from 3 retries to 20 so that this plugin is more easily used in an automated environment.

## [1.0.12] - 2018-08-01

### Added

- This CHANGELOG file to make it easier for future updates to be documented. Sadly, will not be going back to document changes made for previous versions.
