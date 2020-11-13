"use strict"

import shell from "shelljs"

/**
 * Executes given shell command.
 * @param cmd shell command to execute
 * @returns {Promise<void>} Resolves if successfully executed, else rejects
 */
async function exec (cmd) {
  console.debug(`\tRunning command: ${cmd}`)
  return new Promise((resolve, reject) => {
    shell.exec(cmd, { silent: false }, (err, stdout, stderr) => {
      if (err || stderr) {
        // eslint-disable-next-line prefer-promise-reject-errors
        return reject()
      }
      return resolve()
    })
  })
}

/**
 * Move item in folderName to created tempDir
 * @param {string} tempDir
 * @param {string} folderName
 */
async function createTempDir (tempDir, folderName) {
  await exec(`rm -rf ${tempDir}`)
  await exec(`mkdir -p ${tempDir} && cp -R test/integration-tests/${folderName}/. ${tempDir}`)
  await exec(`mkdir -p ${tempDir}/node_modules/.bin`)
  await exec(`ln -s $(pwd) ${tempDir}/node_modules/`)

  await exec(`ln -s $(pwd)/node_modules/serverless ${tempDir}/node_modules/`)
  // link serverless to the bin directory so we can use $(npm bin) to get the path to serverless
  await exec(`ln -s $(pwd)/node_modules/serverless/bin/serverless.js ${tempDir}/node_modules/.bin/serverless`)
}

/**
 * Runs `sls deploy` for the given folder
 * @param tempDir
 * @param identifier Random alphanumeric string to identify specific run of integration tests.
 * @returns {Promise<void>}
 */
function slsDeploy (tempDir, identifier) {
  return exec(`cd ${tempDir} && $(npm bin)/serverless deploy --RANDOM_STRING ${identifier}`)
}

/**
 * Runs `sls remove` for the given folder
 * @param tempDir
 * @param identifier Random alphanumeric string to identify specific run of integration tests.
 * @returns {Promise<void>}
 */
function slsRemove (tempDir, identifier) {
  return exec(`cd ${tempDir} && $(npm bin)/serverless remove --RANDOM_STRING ${identifier}`)
}

export {
  createTempDir,
  exec,
  slsDeploy,
  slsRemove
}
