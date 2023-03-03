export class BaiduTranslate {
  private appId: string;
  private appSecret: string;

  constructor(appId: string, appSecret: string) {
    this.appId = appId;
    this.appSecret = appSecret;
  }

  public getAppId(): string {
    return this.appId;
  }

  public getAppSecret(): string {
    return this.appSecret;
  }
}
