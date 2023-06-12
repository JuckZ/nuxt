import yaml from 'js-yaml';
import fs from 'node:fs';

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

