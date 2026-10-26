/** 解析迁移命令行选项，输入目录由调用方显式提供默认值。 */
import { resolve } from 'node:path';

/** 保留干跑与帮助的只读语义，未知参数立即拒绝。 */
export function parseMigrationArguments(argv, defaultSourceRoot) {
  const options = { sourceRoot: defaultSourceRoot, dryRun: false };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--dry-run') options.dryRun = true;
    else if (argv[index] === '--source-root') {
      const value = argv[++index];
      if (!value || value.startsWith('--')) throw new Error('--source-root 需要目录');
      options.sourceRoot = resolve(value);
    } else if (argv[index] === '--help') options.help = true;
    else throw new Error(`未知参数：${argv[index]}`);
  }
  return options;
}
