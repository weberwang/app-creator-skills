/** 集中最小提交集的共同规则，工程源文件、元数据与忽略模板仍按栈维护。 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildReferenceWorkflow } from './reference-workflow-common.mjs';

const SOURCES = Object.freeze([
  { stack: 'unity', sourcePath: 'unity-game-workflow-control/references/minimal-git.md', hash: 'a05361b5ea832122fbcbe5234fab0b02e2a759cdf7d337e45e3534744a93becf' },
  { stack: 'cocos', sourcePath: 'skills/cocos-game-workflow-control/references/minimal-git.md', hash: 'a0c7c1b33ffc38f26db7b69c0c25f507ea4f2f90fafe93639edce5e85efeb362' },
  { stack: 'phaser', sourcePath: 'skills/phaser4-game-workflow-control/references/minimal-git.md', hash: 'd5966507cd7678619ff0785dd38c4df3acd82dc012db89d6099c15f5a91d8411' },
  { stack: 'threejs', sourcePath: 'skills/threejs-game-workflow-control/references/minimal-git.md', hash: 'd5966507cd7678619ff0785dd38c4df3acd82dc012db89d6099c15f5a91d8411' },
]);

/** 原生提交字段逐项原样保留；这里只共享同章节下可证明一致的完整规则。 */
export function buildSharedGitReference({ sourceRoot, repositoryRoot } = {}) {
  const sources = SOURCES.map((source) => {
    const root = typeof sourceRoot === 'string' ? resolve(sourceRoot, `${source.stack}-skills`) : sourceRoot?.[source.stack];
    if (!root) throw new Error(`最小提交参考缺少源仓库：${source.stack}`);
    const bytes = readFileSync(resolve(root, source.sourcePath));
    if (createHash('sha256').update(bytes).digest('hex') !== source.hash) throw new Error(`最小提交参考源摘要漂移：${source.stack}`);
    return { ...source, text: new TextDecoder('utf-8', { fatal: true }).decode(bytes) };
  });
  const plan = buildReferenceWorkflow({ id: 'git-minimal-submission', title: '最小提交集与引用闭包', sources,
    canonicalize: (block) => {
      const number = block.original.match(/^(\d+[.)]\s+)/)?.[1] ?? '';
      return { ...block, canonical: number + block.canonical };
    },
    reason: '共同 Git 文件选择和引用闭包只维护一份；原生资源身份、工程路径和模板保持技术栈差异。',
  });
  plan.documents[0].content = plan.documents[0].content.replace('\n\n## ', '\n\n仅在当前任务明确包含 Git 提交时使用本规则；阶段结束不自动授予提交、分支、worktree 或推送权限。先读取本栈保留的工程文件、资源身份与忽略模板约束。\n\n## ');
  return { ...plan, repositoryRoot };
}
