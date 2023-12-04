import {ServerlessInstance, ServerlessOptions, ServerlessUtils} from "./types";
import {ConfiguredRetryStrategy} from "@smithy/util-retry";

export default class Globals {
    public static pluginName = "Serverless VPC Discovery";

    public static serverless: ServerlessInstance;
    public static options: ServerlessOptions;
    public static v3Utils?: ServerlessUtils;

    public static getRetryStrategy(attempts: number = 3, delay: number = 3000, backoff: number = 500) {
        return new ConfiguredRetryStrategy(
            attempts, // max attempts.
            // This example sets the backoff at 500ms plus 3s per attempt.
            // https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/modules/_aws_sdk_util_retry.html#aws-sdkutil-retry
            (attempt: number) => backoff + attempt * delay // backoff function.
        )
    }
}
