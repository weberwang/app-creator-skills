/** 从 Unity 全局控制器中保留只读的 Unity 域合同校验器。 */
export function extractUnityDomainValidation(sourceText) {
  if (typeof sourceText !== 'string') throw new TypeError('Unity 工作流源码必须为字符串');

  // 边界锚点必须唯一，防止版本偏移时悄悄截取错误的控制器区域。
  const findSingle = (pattern, label) => {
    const matches = [...sourceText.matchAll(pattern)];
    if (matches.length !== 1) throw new Error(`Unity 工作流源码中的 ${label} 应恰好出现一次`);
    return matches[0];
  };

  // 用两个已知的顶层声明界定原生校验区，避免解析函数体时误判模板字符串或注释中的括号。
  const first = findSingle(/^export function validateWorkItem\(work\) \{/gm, 'validateWorkItem');
  const last = findSingle(/^export function packageComplete\(pkg, executionState = null\) \{/gm, 'packageComplete');
  const start = sourceText.lastIndexOf('/**', first.index);
  const end = sourceText.lastIndexOf('/**', last.index);
  if (start < 0 || end <= start) throw new Error('无法定位 Unity 域校验器的注释边界');

  const validationSource = sourceText.slice(start, end).trim();
  const requiredDeclarations = [
    'validateWorkItem',
    'validateApprovalShape',
    'assertPathOwnership',
    'packageFiles',
    'pathPatternSubset',
    'isSharedUnityPath',
    'validateImplementationPackage',
    'validateUnityOwnership',
    'validateEvidence',
    'validateUnityEvidence',
    'validateImplementationEvidence',
    'statusOf',
    'requiresExactApproval',
    'approvalMatches',
  ];
  for (const name of requiredDeclarations) {
    if (!new RegExp(`^(?:export )?function ${name}\\b`, 'm').test(validationSource)) {
      throw new Error(`Unity 域校验器缺少原生声明：${name}`);
    }
  }

  const topLevelFunctions = [...validationSource.matchAll(/^(?:export )?function\s+([A-Za-z_$][\w$]*)\s*\(/gm)]
    .map((match) => match[1]);
  if (topLevelFunctions.some((name) => !requiredDeclarations.includes(name))) {
    throw new Error(`Unity 域校验区意外包含非白名单函数：${topLevelFunctions.filter((name) => !requiredDeclarations.includes(name)).join(', ')}`);
  }
  if (/^export function (?:run|main|transitionWorkItem|commitWorkMutation|transition)\s*\(/m.test(validationSource)) {
    throw new Error('Unity 域校验模块不得包含工作流执行入口');
  }

  return [
    '/** Unity 原生只读合同校验器；保留专业输入约束，不承担公共流程状态迁移。 */',
    "import { isAbsolute, relative, resolve } from 'node:path';",
    "import process from 'node:process';",
    "import { ACTION_LEVEL, GATES, SCENE_STAGES, STATES, STAGES, UNIT_TYPES, approvalSnapshot, canonicalizePosixPath, enumValue, fail, gateStatuses, knownObject, normalizePattern, pathMatches, schemaVersion, stringArray } from './runtime/control-primitives.mjs';",
    "import { assertVisibleContract, validateUnitDependencies, validateUnityOwnershipShape, validateVisibleEvidenceContract, validateVisibleImplementationPackage, validateVisibleWorkItemContract } from './runtime/visible-contract.mjs';",
    "import { validateStageReviewsShape } from './runtime/stage-confirmation.mjs';",
    "import { validateRiggingDeliveryEvidenceShape, validateRiggingDeliveryWorkItem } from './runtime/rigging-delivery-contract.mjs';",
    "import { assertActiveReferences, validateReturnRecord } from './runtime/return-disposition.mjs';",
    "import { validateResourceHandoffPackage } from './runtime/resource-handoff-evidence.mjs';",
    '',
    validationSource,
    '',
  ].join('\n');
}
