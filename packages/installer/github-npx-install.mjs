#!/usr/bin/env node
/** GitHub 包入口复用包内固定版本，显式指定来源时才访问远程安装器。 */
import { runNpxInstaller } from '../cli/cli.mjs';
import { installSkills } from './install-project-skills.mjs';
import { runRemoteBootstrap } from '../../install.mjs';
import { isDirectEntry } from '../../skills/app-skill-runtime/direct-entry.mjs';

/** 将统一 CLI 的已验证参数交给包内安装事务或显式远程来源。 */
export async function runGitHubNpxInstaller(argv = process.argv.slice(2), runtime = {}) {
  const remote = argv.includes('--repo') || argv.includes('--ref');
  const bootstrap = runtime.bootstrap ?? (remote ? runRemoteBootstrap : async (args) => {
    const result = installSkills({
      projectRoot: args[0],
      stacks: args[args.indexOf('--stack') + 1].split(','),
      dryRun: args.includes('--dry-run'),
      replace: true,
      retainBackup: false,
    });
    // 统一摘要使用远程结果的预览标记，不触发网络访问。
    return { ...result, remote: { dryRun: args.includes('--dry-run') } };
  });
  return runNpxInstaller(argv, { ...runtime, bootstrap });
}

if (isDirectEntry(import.meta.url)) {
  runGitHubNpxInstaller().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
}
