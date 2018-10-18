# serverless-vpc-discovery
[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)
[![Build Status](https://travis-ci.org/amplify-education/serverless-vpc-discovery.svg?branch=master)](https://travis-ci.org/amplify-education/serverless-vpc-discovery)
[![npm version](https://badge.fury.io/js/serverless-vpc-discovery.svg)](https://badge.fury.io/js/serverless-vpc-discovery)
[![MIT licensed](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/amplify-education/serverless-vpc-discovery/master/LICENSE)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/c3ba87d04fe24b8f881252705e51cc29)](https://www.codacy.com/app/CFER/serverless-vpc-discovery?utm_source=github.com&utm_medium=referral&utm_content=amplify-education/serverless-vpc-discovery&utm_campaign=badger)
[![npm downloads](https://img.shields.io/npm/dt/serverless-vpc-discovery.svg?style=flat)](https://www.npmjs.com/package/serverless-vpc-discovery)

The vpc discovery plugin takes the given vpc, subnet, and security group names in the serverless file to setup the vpc configuration for the lambda.

# About Amplify
Amplify builds innovative and compelling digital educational products that empower teachers and students across the country. We have a long history as the leading innovator in K-12 education - and have been described as the best tech company in education and the best education company in tech. While others try to shrink the learning experience into the technology, we use technology to expand what is possible in real classrooms with real students and teachers.

Learn more at https://www.amplify.com

# Getting Started

## Prerequisites
Make sure you have the following installed before starting:
* [nodejs](https://nodejs.org/en/download/)
* [npm](https://www.npmjs.com/get-npm?utm_source=house&utm_medium=homepage&utm_campaign=free%20orgs&utm_term=Install%20npm)
* [serverless](https://serverless.com/framework/docs/providers/aws/guide/installation/)

Also allow the lambda to have the following IAM permissions:
* ec2:CreateNetworkInterface
* ec2:DescribeNetworkInterfaces
* ec2:DeleteNetworkInterface

## Installation
Run:
```
# From npm (recommended)
npm install serverless-vpc-discovery

# From github
npm install https://github.com/amplify-education/serverless-vpc-discovery.git
```
Then make the following edits to your serverless.yaml file:
```yaml
plugins:
  - serverless-vpc-discovery

custom:
  vpc:
    vpcName: '${opt:env}'
    subnetNames:
      - '${opt:env}_NAME OF SUBNET'
    securityGroupNames:
      - '${opt:env}_NAME OF SECURITY GROUP'
```
> NOTE: The naming pattern we used here was building off the vpc name for the subnet and security group by extending it with the the subnet and security group name. This makes it easier to switch to different vpcs by changing the environment variable in the command line

## Running Tests
To run the test:
```
npm test
```
All tests should pass.

If there is an error update the node_module inside the serverless-vpc-discovery folder:
```
npm install
```

## Deploying with the plugin
When deploying run:
```
serverless deploy --env 'VPC Name'
```

And that should be it! Good Luck!

# How it Works

The vpc, subnets, and security groups are found by filtering based on a specified tag name.
Vpc, security groups, and subnets are found under the tag name `tag:Name`.

The vpc is found first as it is used to find the subnets and security groups. Once all of the subnets and security groups are found the serverless service provider creates a vpc object and stores the subnets and security groups.

# Responsible Disclosure
If you have any security issue to report, contact project maintainers privately.
You can reach us at <github@amplify.com>

# Contributing
We welcome pull requests! For your pull request to be accepted smoothly, we suggest that you:
1. For any sizable change, first open a GitHub issue to discuss your idea.
2. Create a pull request.  Explain why you want to make the change and what it’s for.
We’ll try to answer any PR’s promptly.
