import { ServerlessInstance, ServerlessOptions, ServerlessUtils } from "./types";
import { ConfiguredRetryStrategy } from "@smithy/util-retry";
import { fromIni } from "@aws-sdk/credential-providers";

export default class Globals {
  public static pluginName = "Serverless VPC Discovery";

  public static serverless: ServerlessInstance;
  public static options: ServerlessOptions;
  public static v3Utils?: ServerlessUtils;

  public static currentRegion: string;
  public static credentials: any;

  public static defaultRegion = "us-east-1";

  public static getRegion () {
    const slsRegion = Globals.options.region || Globals.serverless.service.provider.region;
    return slsRegion || Globals.currentRegion || Globals.defaultRegion;
  }

  public static async getProfileCreds (profile: string) {
    return await fromIni({ profile })();
  }

  public static getRetryStrategy (attempts: number = 3, delay: number = 3000, backoff: number = 500) {
    return new ConfiguredRetryStrategy(
      attempts, // max attempts.
      // This example sets the backoff at 500ms plus 3s per attempt.
      // https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/modules/_aws_sdk_util_retry.html#aws-sdkutil-retry
      (attempt: number) => backoff + attempt * delay // backoff function.
    );
  }
}
