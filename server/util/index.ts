import yaml from 'js-yaml';
import fs from 'node:fs';
import * as crypto from 'crypto';
import Base64 from 'base-64';

// 加载YAML配置文件
export function loadYamlConfig(filePath: string) {
  let fileContent = fs.readFileSync(filePath, 'utf8');
  return yaml.load(fileContent);
}

// 合并两个配置
export function mixin(baseConfig: object, mixinConfig: object) {
  return { ...baseConfig, ...mixinConfig };
}

// 保存混合后的配置
export function saveYamlConfig(filePath: string, config: object) {
  let yamlConfig = yaml.dump(config);
  fs.writeFileSync(filePath, yamlConfig, 'utf8');
}

export function xiaoAiEncrypt(method: string, urlPath: string, param: string, xiaomiDate: string, host: string, contentType: string, md5: string) {
  const runtimeConfig = useRuntimeConfig()
  const algorithmForMac = "sha256";
  const source = `${method}\n${urlPath}\n${param}\n${xiaomiDate}\n${host}\n${contentType}\n${md5}\n`;
  const decodedSecret = Base64.decode(runtimeConfig.xiaoAiSecret);
  const hmac = crypto.createHmac(algorithmForMac, Buffer.from(decodedSecret, 'binary'));
  hmac.update(source, "utf8");
  const signature = hmac.digest('hex');
  return {
    source,
    signature,
    token: `MIAI-HmacSHA256-V1 ${runtimeConfig.xiaoAiKeyId}::${signature}`
  };
}