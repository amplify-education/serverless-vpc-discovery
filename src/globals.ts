import { ServerlessInstance, ServerlessUtils } from "./types";

export default class Globals {
  public static pluginName = "Serverless VPC Discovery";

  public static serverless: ServerlessInstance;
  public static v3Utils?: ServerlessUtils;

  public static cliLog (prefix: string, message: string): void {
    Globals.serverless.cli.log(`${prefix} ${message}`, Globals.pluginName);
  }

  /**
   * Logs error message
   */
  public static logError (message: string): void {
    if (Globals.v3Utils) {
      Globals.v3Utils.log.error(message);
    } else {
      Globals.cliLog("[Error]", message);
    }
  }

  /**
   * Logs info message
   */
  public static logInfo (message: string): void {
    if (Globals.v3Utils) {
      Globals.v3Utils.log.verbose(message);
    } else {
      Globals.cliLog("[Info]", message);
    }
  }

  /**
   * Logs warning message
   */
  public static logWarning (message: string): void {
    if (Globals.v3Utils) {
      Globals.v3Utils.log.warning(message);
    } else {
      Globals.cliLog("[WARNING]", message);
    }
  }
}
