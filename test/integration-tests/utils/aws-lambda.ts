import { GetFunctionCommand, LambdaClient } from "@aws-sdk/client-lambda";
import Globals from "../../../src/globals";

export default class LambdaWrap {
  private client: LambdaClient;

  constructor (region: string) {
    this.client = new LambdaClient({
      region: region,
      retryStrategy: Globals.getRetryStrategy()
    });
  }

  /**
   * Make Lambda calls to read information about the specific lambda
   * @param {string} funcName
   * @return {Object} all information about a function
   */
  public async getLambdaFunctionInfo (funcName: string) {
    return await this.client.send(
      new GetFunctionCommand({
        FunctionName: funcName,
        Qualifier: "$LATEST"
      })
    );
  }
}
