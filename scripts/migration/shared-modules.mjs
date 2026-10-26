import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, posix } from 'node:path';

const BROWSER_GAME_STACKS = Object.freeze(['cocos', 'phaser', 'threejs']);
const STACK_SOURCE_PREFIXES = Object.freeze({
  cocos: { workflow: 'cocos-game-workflow-control', assets: 'cocos-game-asset-integration', domain: 'cocos-domain-contracts' },
  phaser: { workflow: 'phaser4-game-workflow-control', assets: 'phaser4-game-asset-integration', domain: 'phaser-domain-contracts' },
  threejs: { workflow: 'threejs-game-workflow-control', assets: 'threejs-game-asset-integration', domain: 'threejs-domain-contracts' },
});

const VISUAL_MODULES = Object.freeze([
  { id: 'visual-atomic-contract', filename: 'visual-atomic-contract.mjs', dependencies: [] },
  { id: 'visual-imagegen-format', filename: 'visual-imagegen-format.mjs', dependencies: [] },
  { id: 'visual-human-review-contract', filename: 'visual-human-review-contract.mjs', dependencies: [] },
  { id: 'global-visual-consistency-contract', filename: 'global-visual-consistency-contract.mjs', dependencies: [] },
  { id: 'orientation-validation-scope', filename: 'orientation-validation-scope.mjs', dependencies: [] },
  { id: 'visual-file-gate', filename: 'visual-file-gate.mjs', dependencies: [] },
  {
    id: 'browser-game-domain-path-matcher',
    filename: 'path-matcher.mjs',
    dependencies: [],
    reason: '三种浏览器游戏工作流共用的领域路径模式合同，不作为公共控制器的授权路径匹配器。',
  },
  {
    id: 'workflow-dpr-contract',
    filename: 'workflow-dpr-contract.mjs',
    dependencies: [],
    scope: 'browser-game',
    reason: '仅定义浏览器游戏工作流的 DPR 合同，不外推为 Unity 或 Flutter 原生渲染规则。',
  },
  {
    id: 'display-layer-planning-contract',
    filename: 'display-layer-planning-contract.mjs',
    dependencies: ['skills/app-domain-toolkit/scripts/visual/global-visual-consistency-contract.mjs'],
    imports: ['global-visual-consistency-contract'],
  },
  {
    id: 'visual-validation-policy',
    filename: 'visual-validation-policy.mjs',
    dependencies: ['skills/app-domain-toolkit/scripts/visual/workflow-dpr-contract.mjs'],
    imports: ['workflow-dpr-contract'],
    scope: 'browser-game',
    reason: '仅用于浏览器游戏三栈的视觉验收策略，不作为 Unity 或 Flutter 原生验收规则。',
  },
]);

const FONT_MODULE = Object.freeze({
  id: 'effect-image-font',
  filename: 'effect_image_font.mjs',
  implementation: 'skills/app-domain-toolkit/assets/effect-image-font.mjs',
  reason: '共享固定中文点阵字库；保留源模块内的 Noto Sans CJK SC 字形、许可证与重建来源元数据。',
});

/** 计算共享源字节的 SHA-256，摘要必须来自实际读取的二进制内容。 */
function digest(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

/** 生成仍可从原专业路径导入的薄 ESM 适配器。 */
function makeAdapter(implementation, sourceText, reason) {
  const from = posix.relative('skills/__stack__/scripts', implementation);
  const specifier = `./${from}`.replaceAll('\\', '/');
  const hasDefaultExport = /\bexport\s+default\b|\bexport\s*\{[^}]*\bas\s+default\b/.test(sourceText);
  const lines = [
    `/** ${reason} */`,
    `export * from ${JSON.stringify(specifier)};`,
  ];
  if (hasDefaultExport) lines.push(`export { default } from ${JSON.stringify(specifier)};`);
  return `${lines.join('\n')}\n`;
}

/** 列出模块的静态导入，供共享实现依赖闭包校验使用。 */
function staticImports(sourceText) {
  return [...sourceText.matchAll(/\bfrom\s*['"]([^'"]+)['"]|\bimport\s*['"]([^'"]+)['"]/g)]
    .map((match) => match[1] ?? match[2]);
}

/** 验证纯模块未变成 CLI 或动态资源读取入口，并且依赖仍在批准闭包内。 */
function assertPureModule(filename, sourceText, expectedDependencies) {
  if (/\bimport\s*\(|\bprocess\.argv\b|\bimport\.meta\.url\b|\brequire\.main\b/.test(sourceText)) {
    throw new Error(`共享模块 ${filename} 出现 CLI 或动态模块行为，需重新评估抽取边界。`);
  }
  const actual = staticImports(sourceText).sort();
  const expected = expectedDependencies.map((name) => `./${name}.mjs`).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`共享模块 ${filename} 的依赖闭包漂移：期望 ${expected.join(', ') || '无依赖'}，实际 ${actual.join(', ') || '无依赖'}。`);
  }
}

/** 按源仓库入口定位迁移计划中的原始字节与专业目标路径。 */
function sourceRecord(plansByStack, stack, sourcePath, adapterDestination) {
  const plan = plansByStack.get(stack);
  if (!plan) throw new Error(`共享模块计划缺少技术栈 ${stack}。`);
  const entry = plan.entries.get(sourcePath);
  const sourceBuffer = plan.sourceBuffers.get(sourcePath);
  if (!entry || !sourceBuffer) throw new Error(`${stack} 共享源文件不在已跟踪迁移清单中：${sourcePath}`);
  if (entry.destination !== adapterDestination) {
    throw new Error(`${stack}:${sourcePath} 的专业目标路径变化：期望 ${adapterDestination}，实际 ${entry.destination ?? '无目标'}。`);
  }
  return { stack, sourcePath, adapterDestination, sourceBuffer, entry };
}

/** 将已审计的公共工作流文档转为统一生成器所需的能力与源段落账本。 */
export function buildSharedWorkflowCapabilities(workflowPlan, plans) {
  const plansByStack = new Map(plans.map((plan) => [plan.stack, plan]));
  return workflowPlan.documents.map((document) => {
    const sources = document.sources.map((source) => {
      const plan = plansByStack.get(source.stack);
      const entry = plan?.entries.get(source.sourcePath);
      const sourceBuffer = plan?.sourceBuffers.get(source.sourcePath);
      if (!entry?.destination || !sourceBuffer) throw new Error(`公共工作流来源没有专业目标：${source.stack}:${source.sourcePath}`);
      return {
        stack: source.stack,
        sourcePath: source.sourcePath,
        sourceSha256: digest(sourceBuffer),
        adapterDestination: entry.destination,
        sections: source.sections.map(({ sourceHash, canonicalHash, heading, sourceHeading, sourceRange }) => ({ sourceHash, canonicalHash, heading, sourceHeading, sourceRange })),
      };
    });
    return {
      id: document.capabilityId,
      kind: 'workflow',
      implementation: document.path,
      content: document.content,
      stacks: [...new Set(sources.map((source) => source.stack))].sort(),
      sources,
      dependencies: [],
      reason: document.reason ?? '从源 Skill 中按完整源块摘要追溯共用规则；专业入口保留技术栈专属内容。',
    };
  });
}

/** 按三源字节哈希构造首批视觉模块与字库的共享能力计划。 */
export function buildSharedVisualCapabilities(plans) {
  const plansByStack = new Map(plans.map((plan) => [plan.stack, plan]));
  const capabilities = [];
  for (const spec of VISUAL_MODULES) {
    const implementation = `skills/app-domain-toolkit/scripts/visual/${spec.filename}`;
    const records = BROWSER_GAME_STACKS.map((stack) => {
      const prefixes = STACK_SOURCE_PREFIXES[stack];
      const sourcePath = `skills/${prefixes.workflow}/scripts/${spec.filename}`;
      const adapterDestination = `skills/${prefixes.domain}/scripts/${spec.filename}`;
      return sourceRecord(plansByStack, stack, sourcePath, adapterDestination);
    });
    const canonical = records[0].sourceBuffer;
    const sourceSha256 = digest(canonical);
    if (records.some((record) => !record.sourceBuffer.equals(canonical) || digest(record.sourceBuffer) !== sourceSha256)) {
      throw new Error(`${spec.filename} 的三栈源字节不完全一致，拒绝合并近似实现。`);
    }
    assertPureModule(spec.filename, canonical.toString('utf8'), spec.imports ?? []);
    const reason = spec.reason ?? `三种浏览器游戏技术栈共用的 ${spec.filename} 领域实现。`;
    const adapterReason = `此入口转发到 app-domain-toolkit 的共享实现；${reason}`;
    const adapterContent = makeAdapter(implementation, canonical.toString('utf8'), adapterReason);
    const adapterBytes = Buffer.from(adapterContent, 'utf8');
    for (const record of records) {
      record.entry.sharedImplementationRef = implementation;
      record.entry.sharedAdapterSha256 = digest(adapterBytes);
    }
    capabilities.push({
      id: spec.id,
      kind: 'module',
      implementation,
      content: canonical,
      sourceSha256,
      stacks: [...BROWSER_GAME_STACKS],
      sources: records.map((record) => ({
        stack: record.stack,
        sourcePath: record.sourcePath,
        sourceSha256: digest(record.sourceBuffer),
        adapterDestination: record.adapterDestination,
        adapterContent,
      })),
      dependencies: spec.dependencies,
      reason,
      ...(spec.scope ? { scope: spec.scope } : {}),
      transforms: ['extract-shared-visual-module'],
    });
  }

  const fontRecords = BROWSER_GAME_STACKS.map((stack) => {
    const prefixes = STACK_SOURCE_PREFIXES[stack];
    const sourcePath = `skills/${prefixes.assets}/scripts/${FONT_MODULE.filename}`;
    const adapterDestination = `skills/${prefixes.assets}/scripts/${FONT_MODULE.filename}`;
    return sourceRecord(plansByStack, stack, sourcePath, adapterDestination);
  });
  const fontCanonical = fontRecords[0].sourceBuffer;
  const fontSha256 = digest(fontCanonical);
  if (fontRecords.some((record) => !record.sourceBuffer.equals(fontCanonical) || digest(record.sourceBuffer) !== fontSha256)) {
    throw new Error(`${FONT_MODULE.filename} 的三栈源字节不完全一致，拒绝合并近似字库。`);
  }
  const fontText = fontCanonical.toString('utf8');
  assertPureModule(FONT_MODULE.filename, fontText, []);
  const fontAdapterReason = '此技术栈路径保留为中文效果字库的稳定入口，实际字库与授权来源元数据由 app-domain-toolkit 维护。';
  const fontAdapterContent = makeAdapter(FONT_MODULE.implementation, fontText, fontAdapterReason);
  const fontAdapterBytes = Buffer.from(fontAdapterContent, 'utf8');
  for (const record of fontRecords) {
    record.entry.sharedImplementationRef = FONT_MODULE.implementation;
    record.entry.sharedAdapterSha256 = digest(fontAdapterBytes);
  }
  capabilities.push({
    id: FONT_MODULE.id,
    kind: 'asset',
    implementation: FONT_MODULE.implementation,
    content: fontCanonical,
    sourceSha256: fontSha256,
    stacks: [...BROWSER_GAME_STACKS],
    sources: fontRecords.map((record) => ({
      stack: record.stack,
      sourcePath: record.sourcePath,
      sourceSha256: digest(record.sourceBuffer),
      adapterDestination: record.adapterDestination,
      adapterContent: fontAdapterContent,
    })),
    dependencies: [],
    reason: FONT_MODULE.reason,
    provenance: {
      source: 'Noto Sans CJK SC Regular',
      license: 'SIL Open Font License 1.1',
      provenanceExport: 'EFFECT_IMAGE_FONT_PROVENANCE',
    },
    transforms: ['extract-shared-font-asset'],
  });
  return capabilities;
}

/** 以迁移清单的既有 SHA 所有权规则，安全写入共享真源和专业薄适配器。 */
export function applySharedCapabilities({ capabilities, files, previousHashes, resolveDestination, destinationHash, sha256 }) {
  const seenIds = new Set();
  const seenImplementations = new Set();
  const generatedFiles = [];
  const sharedCapabilities = [];
  for (const capability of capabilities) {
    if (!capability?.id || !capability?.implementation || !Array.isArray(capability.sources)) throw new Error('共享能力描述缺少 id、implementation 或 sources。');
    if (seenIds.has(capability.id)) throw new Error(`共享能力 id 重复：${capability.id}`);
    if (seenImplementations.has(capability.implementation)) throw new Error(`共享实现路径重复：${capability.implementation}`);
    seenIds.add(capability.id);
    seenImplementations.add(capability.implementation);

    const content = Buffer.isBuffer(capability.content) ? capability.content : Buffer.from(capability.content, 'utf8');
    const expectedHash = sha256(content);
    if (capability.sourceSha256 && capability.sourceSha256 !== expectedHash) {
      throw new Error(`共享实现内容与精确源摘要不符：${capability.implementation}`);
    }
    const implementationTarget = resolveDestination(capability.implementation);
    const implementationHash = destinationHash(capability.implementation);
    const previousImplementationHash = previousHashes.get(capability.implementation);
    if (implementationHash && implementationHash !== expectedHash && implementationHash !== previousImplementationHash) {
      throw new Error(`共享实现已存在且不属于未修改的迁移输出，拒绝覆盖：${capability.implementation}`);
    }
    if (implementationHash !== expectedHash) {
      mkdirSync(dirname(implementationTarget), { recursive: true });
      writeFileSync(implementationTarget, content);
    }

    const sourceOrigins = [];
    for (const source of capability.sources) {
      if (!source?.stack || !source.sourcePath || !source.sourceSha256 || !source.adapterDestination) {
        throw new Error(`共享能力 ${capability.id} 的来源记录缺少哈希或专业目标路径。`);
      }
      const ledgerRow = files.find((file) => file.stack === source.stack && file.sourcePath === source.sourcePath);
      if (!ledgerRow || ledgerRow.destination !== source.adapterDestination) {
        throw new Error(`共享能力 ${capability.id} 未能关联专业迁移条目：${source.stack}:${source.sourcePath}`);
      }
      if (ledgerRow.sourceSha256 !== source.sourceSha256) {
        throw new Error(`共享能力 ${capability.id} 的源摘要与迁移账本不符：${source.stack}:${source.sourcePath}`);
      }
      if (source.adapterContent !== undefined || typeof source.adapterTransform === 'function') {
        const adapterTarget = resolveDestination(source.adapterDestination);
        const currentAdapterHash = destinationHash(source.adapterDestination);
        if (currentAdapterHash !== ledgerRow.destinationSha256) {
          throw new Error(`共享入口在基础迁移后与已核验基础账本不符，拒绝替换：${source.adapterDestination}`);
        }
        // 局部模板抽取在已经重基的文本上组合公共字段，不能回写原始源码覆盖其他合法适配。
        const rewritten = typeof source.adapterTransform === 'function' ? source.adapterTransform(readFileSync(adapterTarget, 'utf8')) : source.adapterContent;
        const adapterContent = Buffer.isBuffer(rewritten) ? rewritten : Buffer.from(rewritten, 'utf8');
        writeFileSync(adapterTarget, adapterContent);
        ledgerRow.destinationSha256 = sha256(adapterContent);
        ledgerRow.disposition = 'adapted';
        ledgerRow.reason = capability.reason;
        const appliedTransforms = [...(capability.transforms ?? []), ...(source.transforms ?? [])];
        ledgerRow.transforms = [...new Set([...(appliedTransforms.length ? appliedTransforms : ['extract-shared-module']), 'preserve-specialist-entry'])];
        ledgerRow.sharedImplementationRef = capability.implementation;
      }
      const sections = (source.sections ?? []).map(({ sourceHash, canonicalHash, heading, sourceHeading, sourceRange }) => ({ sourceHash, canonicalHash, heading, sourceHeading, sourceRange }));
      sourceOrigins.push({ stack: source.stack, sourcePath: source.sourcePath, sourceSha256: source.sourceSha256, ...(sections.length ? { sections } : {}) });
    }

    generatedFiles.push({
      path: capability.implementation,
      reason: capability.reason,
      sourceSha256: capability.sourceSha256 ?? null,
      destinationSha256: expectedHash,
      sourceOrigins,
    });
    sharedCapabilities.push({
      id: capability.id,
      kind: capability.kind,
      implementation: capability.implementation,
      stacks: capability.stacks ?? [...new Set(capability.sources.map((source) => source.stack))].sort(),
      sources: capability.sources.map((source) => ({
        stack: source.stack,
        sourcePath: source.sourcePath,
        sourceSha256: source.sourceSha256,
        adapterDestination: source.adapterDestination,
        ...(source.sharedTemplateKeys ? { sharedTemplateKeys: source.sharedTemplateKeys } : {}),
        ...(source.nativeTemplateKeys ? { nativeTemplateKeys: source.nativeTemplateKeys } : {}),
        ...((source.sections?.length) ? { sections: source.sections.map(({ sourceHash, canonicalHash, heading, sourceHeading, sourceRange }) => ({ sourceHash, canonicalHash, heading, sourceHeading, sourceRange })) } : {}),
      })),
      dependencies: capability.dependencies ?? [],
      reason: capability.reason,
      ...(capability.scope ? { scope: capability.scope } : {}),
      ...(capability.provenance ? { provenance: capability.provenance } : {}),
    });
  }
  return { generatedFiles, sharedCapabilities };
}
