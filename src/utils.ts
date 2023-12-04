import { Service } from "aws-sdk";
import {MetadataBearer} from "@smithy/types";
import {Client, Command} from "@smithy/smithy-client";

const RETRYABLE_ERRORS = ["Throttling", "RequestLimitExceeded", "TooManyRequestsException"];

/**
 * Iterate through the pages of a AWS SDK response and collect them into a single array
 *
 * @param client - The AWS service instance to use to make the calls
 * @param resultsKey - The key name in the response that contains the items to return
 * @param nextTokenKey - The request key name to append to the request that has the paging token value
 * @param nextRequestTokenKey - The response key name that has the next paging token value
 * @param params - Parameters to send in the request
 */
async function getAWSPagedResults<ClientOutput, ClientInputCommand extends object, ClientOutputCommand extends MetadataBearer>(
    client: Client<any, any, any, any>,
    resultsKey: string,
    nextTokenKey: string,
    nextRequestTokenKey: string,
    params: Command<any, any, any>
): Promise<ClientOutput[]> {
  let results = [];
  let response = await client.send(params);
  results = results.concat(response[resultsKey] || results);
  while (
    response.hasOwnProperty(nextRequestTokenKey) &&
    response[nextRequestTokenKey]
  ) {
    params.input[nextTokenKey] = response[nextRequestTokenKey];
    response = await client.send(params);
    results = results.concat(response[resultsKey]);
  }
  return results;
}

async function throttledCall (service: Service, funcName: string, params: object): Promise<any> {
  const maxTimePassed = 5 * 60;

  let timePassed = 0;
  let previousInterval = 0;

  const minWait = 3;
  const maxWait = 60;

  while (true) {
    try {
      return await service[funcName](params).promise();
    } catch (ex) {
      // rethrow the exception if it is not a type of retryable exception
      if (RETRYABLE_ERRORS.indexOf(ex.code) === -1) {
        throw ex;
      }

      // rethrow the exception if we have waited too long
      if (timePassed >= maxTimePassed) {
        throw ex;
      }

      // Sleep using the Decorrelated Jitter algorithm recommended by AWS
      // https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
      let newInterval = Math.random() * Math.min(maxWait, previousInterval * 3);
      newInterval = Math.max(minWait, newInterval);

      await sleep(newInterval);
      previousInterval = newInterval;
      timePassed += previousInterval;
    }
  }
}

/**
 * Stops event thread execution for given number of seconds.
 * @param seconds
 * @returns {Promise<void>} Resolves after given number of seconds.
 */
async function sleep (seconds) {
  return new Promise((resolve) => setTimeout(resolve, 1000 * seconds));
}

function isObjectEmpty (object: Object): boolean {
  return Object.keys(object).length === 0;
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
  throttledCall,
  isObjectEmpty,
  wildcardMatches,
  getValueFromTags
};
