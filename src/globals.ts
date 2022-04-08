import { ServerlessInstance, ServerlessLog, ServerlessProgress } from "./types";

export default class Globals {
  public static pluginName = "Serverless VPC Discovery";

  public static serverless: ServerlessInstance;

  public static log: ServerlessLog;

  public static progress: ServerlessProgress;
}
