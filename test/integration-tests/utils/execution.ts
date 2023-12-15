"use strict";

import shell from "shelljs";

/**
 * Executes given shell command.
 */
async function exec (cmd: string): Promise<string> {
  console.debug(`\tRunning command: ${cmd}`);
  return new Promise((resolve, reject) => {
    shell.exec(cmd, { silent: false }, (errorCode, stdout, stderr) => {
      if (errorCode === 0) {
        return resolve(stdout);
      }
      return reject(stderr);
    });
  });
}

/**
 * Move item in folderName to created tempDir
 * @param {string} tempDir
 * @param {string} folderName
 */
async function createTempDir (tempDir, folderName) {
  await exec(`rm -rf ${tempDir}`);
  await exec(`mkdir -p ${tempDir} && cp -R test/integration-tests/${folderName}/. ${tempDir}`);
  await exec(`mkdir -p ${tempDir}/node_modules/.bin`);
  await exec(`ln -s $(pwd) ${tempDir}/node_modules/`);

  await exec(`ln -s $(pwd)/node_modules/serverless ${tempDir}/node_modules/`);
  // link serverless to the bin directory so we can use $(npm bin) to get the path to serverless
  await exec(`ln -s $(pwd)/node_modules/serverless/bin/serverless.js ${tempDir}/node_modules/.bin/serverless`);
}

/**
 * Runs `sls deploy` for the given folder
 * @param tempDir
 * @returns {Promise<void>}
 */
function slsDeploy (tempDir) {
  return exec(`cd ${tempDir} && npx serverless deploy`);
}

/**
 * Runs `sls remove` for the given folder
 * @param tempDir
 * @returns {Promise<void>}
 */
function slsRemove (tempDir) {
  return exec(`cd ${tempDir} && npx serverless remove --verbose`);
}

export {
  createTempDir,
  exec,
  slsDeploy,
  slsRemove
};
