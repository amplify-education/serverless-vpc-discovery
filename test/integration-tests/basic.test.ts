"use strict"

import "mocha"
import { getRandomString, TEST_DOMAIN } from "./base"
import * as utilities from "./test-utilities"

const CONFIGS_FOLDER = "basic"
const TIMEOUT_MINUTES = 15 * 60 * 1000 // 15 minutes in milliseconds
const RANDOM_STRING = getRandomString()
const TEMP_DIR = `~/tmp/vpc-discovery-test-${RANDOM_STRING}`

describe("Integration Tests", function () {
  this.timeout(TIMEOUT_MINUTES)

  it("Basic example", async () => {
    const testName = "basic-example"
    const configFolder = `${CONFIGS_FOLDER}/${testName}`
    const testURL = `${testName}-${RANDOM_STRING}.${TEST_DOMAIN}`
    // Perform sequence of commands to replicate basepath mapping issue
    try {
      await utilities.createTempDir(TEMP_DIR, configFolder)
      await utilities.slsDeploy(TEMP_DIR, RANDOM_STRING)
    } finally {
      await utilities.destroyResources(testURL, RANDOM_STRING)
    }
  })
})
