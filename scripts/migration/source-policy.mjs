import { capabilityForSourceSkill, nativeAdapterPath } from '../capability-map.mjs';

/**
 * 源仓库映射规则集中放置于此，迁移流程只按本策略判定文件去向。
 * 专业技能目录沿用原名；只有四种旧全局控制器改名为领域合同资源。
 */
export const STACK_POLICIES = Object.freeze({
  unity: {
    repository: 'unity-skills',
    skillPrefix: '',
    control: 'unity-game-workflow-control',
    orchestrator: 'unity-development-workflow',
    grilling: 'unity-game-grilling',
    expectedRootSkillCount: 19,
    rootTools: [],
    removedControlFiles: [
      'scripts/workflow-control.mjs',
      'scripts/runtime/execution-state.mjs',
      'scripts/runtime/execution-transaction.mjs',
      'scripts/stage-transition.mjs',
      'scripts/scene-stage-transition.mjs',
      'scripts/workflow-implementation-transition.mjs',
      'scripts/execution-unit-control.mjs',
      'scripts/parallel-batch-control.mjs',
    ],
    replacedControlTests: [
      'workflow-control.test.mjs',
      'workflow-sync-control.test.mjs',
      'workflow-policy.test.mjs',
      'workflow-update.test.mjs',
      'execution-state.test.mjs',
      'execution-transaction.test.mjs',
      'scene-stage-transition.test.mjs',
      'workflow-implementation-transition.test.mjs',
      'execution-validation.test.mjs',
    ],
  },
  cocos: {
    repository: 'cocos-skills',
    skillPrefix: 'skills/',
    control: 'cocos-game-workflow-control',
    orchestrator: 'cocos-game-orchestrator',
    grilling: 'grilling',
    expectedRootSkillCount: 19,
    rootTools: [],
    removedControlFiles: [
      'scripts/workflow-control.mjs',
      'scripts/runtime/workflow-state-contract.mjs',
      'scripts/runtime/workflow-view.mjs',
      'scripts/runtime/stable-commands.mjs',
      'scripts/runtime/validation-context.mjs',
      'scripts/runtime/approval-contract.mjs',
      'scripts/runtime/workflow-scope.mjs',
      'scripts/scene-stage-transition.mjs',
      'scripts/workflow-implementation-transition.mjs',
      'scripts/execution-unit-control.mjs',
      'scripts/parallel-batch-control.mjs',
      'scripts/parallel-plan.mjs',
    ],
    replacedControlTests: [
      'workflow-control.test.mjs',
      'workflow-view.test.mjs',
      'minimal-git.test.mjs',
      'execution-validation.test.mjs',
      'scene-stage-transition.test.mjs',
      'parallel-plan.test.mjs',
      'stable-commands.test.mjs',
      'validation-context.test.mjs',
      'workflow-scope.test.mjs',
    ],
  },
  phaser: {
    repository: 'phaser-skills',
    skillPrefix: 'skills/',
    control: 'phaser4-game-workflow-control',
    orchestrator: 'phaser4-game-orchestrator',
    grilling: 'grilling',
    expectedRootSkillCount: 18,
    rootTools: [],
    removedControlFiles: [
      'scripts/workflow-control.mjs',
      'scripts/runtime/workflow-state-contract.mjs',
      'scripts/runtime/workflow-view.mjs',
      'scripts/runtime/stable-commands.mjs',
      'scripts/runtime/validation-context.mjs',
      'scripts/runtime/approval-contract.mjs',
      'scripts/runtime/workflow-scope.mjs',
      'scripts/scene-stage-transition.mjs',
      'scripts/workflow-implementation-transition.mjs',
      'scripts/execution-unit-control.mjs',
      'scripts/parallel-batch-control.mjs',
      'scripts/parallel-plan.mjs',
    ],
    replacedControlTests: [
      'workflow-control.test.mjs',
      'workflow-view.test.mjs',
      'minimal-git.test.mjs',
      'execution-validation.test.mjs',
      'scene-stage-transition.test.mjs',
      'parallel-plan.test.mjs',
      'stable-commands.test.mjs',
      'validation-context.test.mjs',
      'workflow-scope.test.mjs',
    ],
  },
  threejs: {
    repository: 'threejs-skills',
    skillPrefix: 'skills/',
    control: 'threejs-game-workflow-control',
    orchestrator: 'threejs-game-orchestrator',
    grilling: 'grilling',
    expectedRootSkillCount: 21,
    rootTools: ['scripts/verify-game-build.mjs'],
    removedControlFiles: [
      'scripts/workflow-control.mjs',
      'scripts/runtime/workflow-state-contract.mjs',
      'scripts/runtime/workflow-view.mjs',
      'scripts/runtime/stable-commands.mjs',
      'scripts/runtime/validation-context.mjs',
      'scripts/runtime/approval-contract.mjs',
      'scripts/runtime/workflow-scope.mjs',
      'scripts/scene-stage-transition.mjs',
      'scripts/workflow-implementation-transition.mjs',
      'scripts/execution-unit-control.mjs',
      'scripts/parallel-batch-control.mjs',
      'scripts/parallel-plan.mjs',
    ],
    replacedControlTests: [
      'workflow-control.test.mjs',
      'workflow-view.test.mjs',
      'minimal-git.test.mjs',
      'execution-validation.test.mjs',
      'scene-stage-transition.test.mjs',
      'parallel-plan.test.mjs',
      'stable-commands.test.mjs',
      'validation-context.test.mjs',
      'workflow-scope.test.mjs',
    ],
  },
  flutter: {
    repository: 'flutter-skills',
    skillPrefix: '',
    control: null,
    orchestrator: 'flutter-app-orchestrator',
    grilling: 'grilling',
    expectedRootSkillCount: 14,
    rootTools: ['scripts/workflow-snapshot.js', 'scripts/validate-workflow.js'],
    removedControlFiles: [],
    replacedControlTests: [],
  },
});

/** 这些公共技能已在目标仓库维护，不复制源仓库入口覆盖它们。 */
export const PUBLIC_SKILLS = Object.freeze({
  control: 'app-workflow-control',
  orchestrator: 'app-creator-workflow',
  grilling: 'grilling',
});

/** 第三方依赖桥接文件由主代理维护，本策略只记录模块映射。 */
export const RUNTIME_MODULES = Object.freeze({
  sharp: 'sharp.mjs',
  yaml: 'yaml.mjs',
  'ajv/dist/2020.js': 'ajv2020.mjs',
  'ajv-formats': 'ajv-formats.mjs',
});

/** 归档无法作为新公共状态机回归的原始测试，并指向实际替代测试。 */
function archiveReplacedTest(stack, sourcePath) {
  return `migration/source-tests/${stack}/replaced/${sourcePath}.source`;
}

/**
 * 将 Git 返回的源相对路径转换成目标相对路径。
 * @param {string} stack 技术栈名
 * @param {string} sourcePath 源仓库内的 POSIX 路径
 * @param {Set<string>} rootSkills 正式根技能目录名
 * @returns {{destination:string|null,disposition:string,reason:string,transforms:string[]}}
 */
export function mapSourceFile(stack, sourcePath, rootSkills) {
  const policy = STACK_POLICIES[stack];
  const localPath = policy.skillPrefix && sourcePath.startsWith(policy.skillPrefix)
    ? sourcePath.slice(policy.skillPrefix.length)
    : sourcePath;
  const parts = localPath.split('/');
  const first = parts[0];
  const remainder = parts.slice(1).join('/');
  const exactControlFiles = new Set(policy.removedControlFiles);

  if (sourcePath === 'package.json' || sourcePath === 'package-lock.json' || sourcePath === 'npm-shrinkwrap.json') {
    return { destination: null, disposition: 'source-only', reason: '源仓库包清单只作来源审计；安装器和依赖由目标仓库统一维护。', transforms: [] };
  }
  if (sourcePath === 'README.md' || sourcePath === '.gitignore' || sourcePath === '.npmignore' || sourcePath === 'skills-lock.json' || sourcePath.startsWith('.agents/')) {
    return { destination: null, disposition: 'source-only', reason: '源仓库入口或本地元数据由目标仓库公共文档与安装器替代。', transforms: [] };
  }

  if (policy.control && first === policy.control) {
    const oldControlPath = remainder;
    const resourceRoot = `skills/${stack}-domain-contracts`;
    if (exactControlFiles.has(oldControlPath)) {
      const isPublicCli = oldControlPath === 'scripts/workflow-control.mjs';
      if (stack === 'unity' && isPublicCli) {
        return { destination: `${resourceRoot}/scripts/unity-contract-validation.mjs`, replacement: 'skills/app-workflow-control/scripts/workflow-control.mjs', disposition: 'adapted', reason: '从混合入口抽取 Unity 原生上下文、实施包和证据校验；旧全局 CLI 由公共控制器替代。', transforms: ['extract-unity-domain-validation', 'replace-global-cli-with-app-workflow-control'] };
      }
      return { destination: isPublicCli ? 'skills/app-workflow-control/scripts/workflow-control.mjs' : null, replacement: 'skills/app-workflow-control/scripts/workflow-control.mjs', disposition: 'merged', reason: '旧全局控制器/状态执行实现由唯一公共控制器替代，不复制第二套状态机。', transforms: ['replaced-by-app-workflow-control'] };
    }
    if (oldControlPath === 'SKILL.md') {
      return { destination: `${resourceRoot}/references/technical-control.md`, replacement: `skills/${PUBLIC_SKILLS.control}/SKILL.md`, disposition: 'adapted', reason: '完整归档旧控制技能正文为领域合同参考；当前控制入口由公共 app-workflow-control 替代。', transforms: ['archive-control-entry', 'public-control-route'] };
    }
    if (oldControlPath.startsWith('scripts/') && oldControlPath.endsWith('.test.mjs') && policy.replacedControlTests.some((name) => oldControlPath.endsWith(name))) {
      return { destination: archiveReplacedTest(stack, sourcePath), replacement: 'tests/control/controller.test.mjs', disposition: 'test-replaced', reason: '完整归档旧全局控制器/状态执行回归源码但不作为可执行测试分发；目标公共控制器测试覆盖当前状态边界。', transforms: ['archive-legacy-test-source', 'replaced-by-public-controller-tests'] };
    }
    if (oldControlPath === 'agents/openai.yaml') {
      return { destination: null, disposition: 'source-only', reason: '旧控制入口路由元数据已由目标公共技能 frontmatter 与安装清单替代。', transforms: ['public-control-route'] };
    }
    if (oldControlPath === 'package.json' || oldControlPath === 'package-lock.json') {
      return { destination: null, disposition: 'source-only', reason: '旧控制包清单含已废弃全局 CLI 声明；工具入口已登记到迁移目录。', transforms: [] };
    }
    if (oldControlPath.startsWith('references/')) return { destination: `${resourceRoot}/${oldControlPath}`, disposition: 'copied', reason: '保留原领域合同、schema、示例和说明资源；公共控制语义由 app-workflow-control 负责。', transforms: [] };
    if (stack === 'unity' && oldControlPath === 'scripts/runtime/io.mjs') return { destination: `${resourceRoot}/${oldControlPath}`, disposition: 'adapted', reason: '只保留领域校验依赖的只读 Unity 路径规范函数；旧原子写入与状态锁不迁入。', transforms: ['retain-read-only-path-contract'] };
    if (oldControlPath.startsWith('scripts/')) return { destination: null, disposition: 'source-only', reason: '仅在专业技能、文档显式工具或 package.bin 静态导入闭包引用时迁入；未引用的旧控制实现不构成第二套状态机。', transforms: [] };
    return { destination: `${resourceRoot}/${oldControlPath}`, disposition: 'copied', reason: '保留非执行型技术资源；旧全局 CLI/状态逻辑不复制。', transforms: [] };
  }

  if (first === policy.orchestrator) {
    if (remainder === 'SKILL.md') {
      return { destination: `skills/${first}/references/technical-orchestration.md`, replacement: `skills/${PUBLIC_SKILLS.orchestrator}/SKILL.md`, disposition: 'adapted', reason: '完整归档技术栈原编排正文供领域参考；公共阶段流程由 app-creator-workflow 替代。', transforms: ['archive-orchestrator-entry', 'public-orchestrator-route', 'apply-current-global-rules'] };
    }
    if (remainder === 'package.json' || remainder === 'package-lock.json') {
      return { destination: null, disposition: 'source-only', reason: '旧编排包元数据不参与目标技能运行。', transforms: [] };
    }
    return { destination: `skills/${first}/${remainder}`, disposition: 'copied', reason: '保留旧编排目录中的技术栈专属模板、脚本、参考资料和测试工具。', transforms: [] };
  }

  if (first === policy.grilling) {
    const resourceRoot = `skills/${stack}-domain-contracts/technical-grilling`;
    if (remainder === 'SKILL.md') {
      return { destination: `skills/${stack}-domain-contracts/references/technical-grilling.md`, replacement: `skills/${PUBLIC_SKILLS.grilling}/SKILL.md`, disposition: 'adapted', reason: '完整归档源拷问技能正文并记录技术栈问题素材；公共 grilling 入口由统一技能替代。', transforms: ['archive-grilling-entry', 'public-grilling-route'] };
    }
    if (remainder === 'package.json' || remainder === 'package-lock.json') {
      return { destination: null, disposition: 'source-only', reason: '源拷问包清单不参与目标技能运行。', transforms: [] };
    }
    return { destination: `${resourceRoot}/${remainder}`, disposition: 'copied', reason: '保留源拷问技能的配套资料，随公共 grilling 技能使用。', transforms: [] };
  }

  if (rootSkills.has(first)) {
    const capability = capabilityForSourceSkill(stack, first);
    if (!capability) throw new Error(`未分组的源专业技能：${stack}/${first}`);
    if (remainder === 'SKILL.md') return { destination: nativeAdapterPath(first), capabilityRef: `skills/${capability.name}/SKILL.md`, disposition: 'adapted', reason: '专业入口合并到公共能力；完整原生正文保留为非入口 ADAPTER.md。', transforms: ['merge-entry-into-capability', 'retain-native-adapter'] };
    return { destination: `skills/${first}/${remainder}`, disposition: 'copied', reason: '按原技能目录名完整保留专业技能及其脚本、模板、校验器和测试。', transforms: [] };
  }

  if (sourcePath.startsWith('skills/')) {
    const resourcePath = sourcePath.slice('skills/'.length);
    return { destination: `skills/${stack}-domain-contracts/source-resources/${resourcePath}`, disposition: 'copied', reason: '保留没有正式 SKILL.md 入口但被 Git 跟踪的技术资源目录。', transforms: [] };
  }

  if (sourcePath.startsWith('docs/')) {
    return { destination: `migration/source-docs/${stack}/${sourcePath}`, disposition: 'copied', reason: '保留源仓库的文档与设计材料，供迁移审计和领域参考。', transforms: ['archive-source-document'] };
  }

  if (sourcePath.startsWith('tests/')) {
    const basename = parts.at(-1) ?? '';
    if (stack === 'unity' && basename === 'rigging-delivery-gate.test.mjs') {
      return { destination: archiveReplacedTest(stack, sourcePath), replacement: 'tests/unity-domain-preservation.test.mjs', replacements: ['tests/unity-domain-preservation.test.mjs', 'skills/unity-domain-contracts/scripts/runtime/rigging-delivery-contract.test.mjs'], disposition: 'test-replaced', reason: '保留原混合回归源码归档；Unity 原生验证由专用 validator 测试及骨骼领域合同测试覆盖，旧 run/transition 由公共控制器测试覆盖。', transforms: ['archive-legacy-test-source', 'replace-mixed-state-and-domain-tests'] };
    }
    if (stack === 'unity' && basename === 'ui-layout-gate.test.mjs') {
      return { destination: archiveReplacedTest(stack, sourcePath), replacement: 'skills/unity-domain-contracts/scripts/runtime/ui-layout-evidence.test.mjs', replacements: ['tests/control/controller.test.mjs', 'skills/unity-domain-contracts/scripts/runtime/ui-layout-evidence.test.mjs'], disposition: 'test-replaced', reason: '保留原混合回归源码归档；布局领域合同由其纯校验器测试覆盖，旧全局门禁流程由公共控制器测试覆盖。', transforms: ['archive-legacy-test-source', 'replace-mixed-state-and-domain-tests'] };
    }
    if (stack === 'unity' && basename === 'resource-handoff-gate.test.mjs') {
      return { destination: archiveReplacedTest(stack, sourcePath), replacement: 'skills/unity-domain-contracts/scripts/runtime/resource-handoff-evidence.test.mjs', replacements: ['tests/control/controller.test.mjs', 'skills/unity-domain-contracts/scripts/runtime/resource-handoff-evidence.test.mjs'], disposition: 'test-replaced', reason: '保留原混合回归源码归档；资源交接领域合同由纯校验器测试覆盖，旧全局门禁流程由公共控制器测试覆盖。', transforms: ['archive-legacy-test-source', 'replace-mixed-state-and-domain-tests'] };
    }
    if (/(^|[-_.])(workflow-control|workflow-policy|workflow-sync-control|workflow-update|execution-state|execution-transaction|workflow-view|minimal-git|skill-installer|npx-installer|install-skills?|install-project-skills)([-_.]|$)/i.test(basename)) {
      const replacement = /installer|install-skills|npx-installer/i.test(basename) ? 'tests/installer.test.mjs' : 'tests/control/controller.test.mjs';
      const replacements = stack === 'unity' && basename === 'workflow-control.test.mjs' ? [replacement, 'tests/unity-domain-preservation.test.mjs'] : [replacement];
      return { destination: archiveReplacedTest(stack, sourcePath), replacement, replacements, disposition: 'test-replaced', reason: '完整归档旧全局控制、状态机或安装器测试源码但不执行；目标仓库对应公共控制器/安装器测试替代。', transforms: ['archive-legacy-test-source', 'replaced-by-public-controller-tests'] };
    }
    return { destination: `migration/source-tests/${stack}/${sourcePath}`, disposition: 'copied', reason: '专业回归测试与夹具保留在目标仓库默认测试发现中并实际执行；仅 replaced/*.source 归档不执行。', transforms: ['archive-source-test'] };
  }

  if (sourcePath.startsWith('scripts/')) {
    const basename = parts.at(-1) ?? '';
    if (/^install(?:-|\.)/i.test(basename) || /install-(?:skills|project-skills)/i.test(basename)) {
      return { destination: null, replacement: 'scripts/install-project-skills.mjs', disposition: 'source-only', reason: '旧安装器由目标仓库统一安装器替代。', transforms: [] };
    }
    if (policy.rootTools.includes(sourcePath)) {
      return { destination: `skills/${stack}-domain-contracts/tools/${sourcePath}`, disposition: 'copied', reason: '保留源仓库公开的专业校验/工作流工具，并在迁移中重定向公共权威路径。', transforms: ['preserve-professional-tool'] };
    }
    return { destination: `migration/source-tests/${stack}/${sourcePath}`, disposition: 'copied', reason: '保留源仓库的测试运行器和工具脚本以便复核专业测试。', transforms: ['archive-source-test-tool'] };
  }

  if (sourcePath.startsWith('bin/')) {
    if (/install/i.test(parts.at(-1) ?? '')) {
      return { destination: null, replacement: 'scripts/install-project-skills.mjs', disposition: 'source-only', reason: '旧技能安装器由目标仓库统一安装器替代。', transforms: [] };
    }
    return { destination: `skills/${stack}-domain-contracts/tools/${sourcePath}`, disposition: 'copied', reason: '保留源仓库发布的专业工具入口。', transforms: ['preserve-professional-tool'] };
  }

  return { destination: null, disposition: 'source-only', reason: '来源审计文件与公共工作流/技术技能运行无直接关系，目标仓库未承接该元数据。', transforms: [] };
}
