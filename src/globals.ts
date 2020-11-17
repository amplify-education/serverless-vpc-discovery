import { ServerlessInstance } from "./types";

export default class Globals {
  public static pluginName = "Serverless VPC Discovery";

  public static serverless: ServerlessInstance;

  public static cliLog (prefix: string, message: string): void {
    Globals.serverless.cli.log(`${prefix} ${message}`, Globals.pluginName);
  }

  /**
   * Logs info message
   * @param message: message to be printed
   * @param debug: if true then show log only if SLS_DEBUG enabled on else anytime.
   * By default debug mode off and a message printed for each call.
   */
  public static logInfo (message: any, debug = false): void {
    const canLog = (debug && process.env.SLS_DEBUG) || !debug;
    if (canLog) {
      Globals.cliLog("Info:", message);
    }
  }

  /**
   * Logs warning message
   * @param message: message to be printed
   * @param debug: if true then show log only if SLS_DEBUG enabled on else anytime.
   * By default debug mode off and a message printed for each call.
   */
  public static logWarning (message: any, debug = false): void {
    const canLog = (debug && process.env.SLS_DEBUG) || !debug;
    if (canLog) {
      Globals.cliLog("WARNING:", message);
    }
  }

  /**
   * Logs error message
   * @param message: message to be printed
   * @param debug: if true then show log only if SLS_DEBUG enabled on else anytime.
   * By default debug mode on and a message will be printed for SLS_DEBUG enabled.
   */
  public static logError (message: any, debug: boolean = true): void {
    const canLog = (debug && process.env.SLS_DEBUG) || !debug;
    if (canLog) {
      Globals.cliLog("Error:", message);
    }
  }
}
