# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2020-12-15
### Added
- Possibility to specify tag name and tag values for getting subnets and security groups. Also, support for security groups names.  
### Changed
- ***Important!*** The `subnetNames` and `securityGroupNames` options have been deprecated but it still will work for a while. The new option are `subnets` and `securityGroups`.

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
