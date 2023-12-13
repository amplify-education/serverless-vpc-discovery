import { Client, Command } from "@smithy/smithy-client";

/**
 * Iterate through the pages of a AWS SDK response and collect them into a single array
 *
 * @param client - The AWS service instance to use to make the calls
 * @param resultsKey - The key name in the response that contains the items to return
 * @param nextTokenKey - The request key name to append to the request that has the paging token value
 * @param nextRequestTokenKey - The response key name that has the next paging token value
 * @param params - Parameters to send in the request
 */
async function getAWSPagedResults<ClientOutput> (
  client: Client<any, any, any, any>,
  resultsKey: string,
  nextTokenKey: string,
  nextRequestTokenKey: string,
  params: Command<any, any, any>
): Promise<ClientOutput[]> {
  let results = [];
  let response = await client.send(params);
  results = results.concat(response[resultsKey] || results);
  while (nextRequestTokenKey in response && response[nextRequestTokenKey]) {
    params.input[nextTokenKey] = response[nextRequestTokenKey];
    response = await client.send(params);
    results = results.concat(response[resultsKey]);
  }
  return results;
}

/**
 * Stops event thread execution for given number of seconds.
 * @param seconds
 * @returns {Promise<void>} Resolves after given number of seconds.
 */
async function sleep (seconds) {
  return new Promise((resolve) => setTimeout(resolve, 1000 * seconds));
}

function isObjectEmpty (value: object): boolean {
  return Object.keys(value).length === 0;
}

function replaceAll (input: string, search: string, replace: string) {
  return input.split(search).join(replace);
}

function wildcardMatches (inputArn: string, actualArn: string) {
  const noColon = "[^:]";
  const inputArnRegexStr = replaceAll(replaceAll(inputArn, "?", noColon), "*", `${noColon}*`);
  const inputArnRegex = new RegExp(`^${inputArnRegexStr}$`);

  return inputArnRegex.test(actualArn);
}

function getValueFromTags (tags, tagKey) {
  const tagItem = tags.find((tag) => tag.Key === tagKey);
  if (tagItem) {
    return tagItem.Value;
  }
  return null;
}

export {
  sleep,
  getAWSPagedResults,
  isObjectEmpty,
  wildcardMatches,
  getValueFromTags
};
