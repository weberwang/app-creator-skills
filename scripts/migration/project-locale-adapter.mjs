/** 将经审计的旧源语言合同转为项目语言范围，源实现与作者模板各保留明确责任。 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PACKAGE = 'unity-development-workflow/assets/unity-workflow-toolkit/Packages/com.project.unity-workflow-toolkit/';
const AUTHORED = Object.freeze({
  [`${PACKAGE}Editor/FontPipeline/TmpFontAtlasGenerator.cs`]: ['locale-tmp-generator.source', '392d7e13905aa5e212d4cf68e85ec6cdb304b4aeb867a234a70e1b9050030be0'],
  [`${PACKAGE}Runtime/LocalizedTmpFontBinder.cs`]: ['locale-tmp-binder.source', 'dc3f2d5faa948a44e4f946308abdea2464fd605e8fbbcd4be913d43b5c759443'],
  [`${PACKAGE}Editor/FontPipeline/TmpFontAtlasPlan.cs`]: ['locale-tmp-plan.source', '1055a878e35f58b4f0b2cb827a4d70af115b1eaea2fa34014201203a26d79614'],
  [`${PACKAGE}Editor/PipelineCommands/Project.UnityWorkflow.PipelineCommands.asmdef`]: ['locale-pipeline-asmdef.source', '54870bd9a09ed2ddf2204519659a28c5a22fd4eba4b001b3a23798258d7a65a4'],
  [`${PACKAGE}Runtime/Project.UnityWorkflow.Runtime.asmdef`]: ['locale-runtime-asmdef.source', 'c38077455bb77fb1538c294e0d346fdb4041fa8ac08d6d77596c518371ef035b'],
  'unity-development-workflow/references/tmp-font-atlas-workflow.md': ['locale-font-workflow.source', '0f70d35cd37a2eb13b97a8b83906413f18cce8ca67a2dbd3a2551475db54bb32'],
  'skills/cocos-game-ui-layout/references/ui-layout-contract.schema.json': ['locale-cocos-schema.source', '1cea7526248cd984a1c2d29152e2374d6acd00d307db6a377d2eada2e9c025da'],
  'skills/cocos-game-ui-layout/assets/ui-layout-contract-template.yaml': ['locale-cocos-reference-template.source', 'a80051272edb0ea0b94058899575ba5c88c3bb2ab0e1ac6453727410d0f350a4'],
  'skills/cocos-game-ui-layout/assets/ordinary-ui-layout-contract-template.yaml': ['locale-cocos-ordinary-template.source', '6a6b9fdb3ed10cd0a5816ba857254c56d22d1d75845166d0a7fdd5fa4502ece5'],
  'skills/cocos-game-ui-layout/scripts/ui-layout-contract-sources.mjs': ['locale-cocos-sources.source', '6b83eb27785a34f826da9a454bf52b6d571155083385c2fbcbd7b3858099bf21'],
  'skills/cocos-game-ui-layout/scripts/validate_ui_layout_contract.mjs': ['locale-cocos-validator.source', 'ce210455b6a8522dd47342aab5a81bd90a02f8be45331492c4c9f241b5a6637e'],
  'skills/cocos-game-ui-layout/scripts/validate_ui_layout_contract.test.mjs': ['locale-cocos-validator-tests.source', '2bd4d7ece8fbbcaddf97a857725c6032ac52f313edee7b6a542b4b8a6399767c'],
  'skills/phaser4-game-ui-layout/scripts/validate_ui_layout_contract.mjs': ['locale-phaser-validator.source', 'd0bc1f45a8e32250eb59408f08cb4df75919f4676e471eb998fcc3d483ea7c9f'],
  'skills/phaser4-game-ui-layout/scripts/validate_ui_layout_contract.test.mjs': ['locale-phaser-validator-tests.source', '5f9fd4a265cfda312f7fa56d1db47795df82d1713c686e0266b59f590b8f2fe9'],
  'skills/phaser4-game-ui-layout/assets/ui-layout-contract-template.yaml': ['locale-phaser-template.source', '1fd4f7759c7b91a8ece6c7b52856b586231b32ccb4c9f85c3e35b91121907761'],
  'skills/threejs-game-ui-layout/scripts/validate_ui_layout_contract.mjs': ['locale-threejs-validator.source', 'd8a46f725b8d1f9bfca460544e4a15e4631b93ac92437ee1ec07dc57c263fdf0'],
  'skills/threejs-game-ui-layout/scripts/validate_ui_layout_contract.test.mjs': ['locale-threejs-validator-tests.source', 'cc4d2f3e1821a948a03ce297e0d003d7c0436a2c7fa56098db11ea2bd0716e19'],
  'skills/threejs-game-ui-layout/assets/ui-layout-contract-template.yaml': ['locale-threejs-template.source', '9a8f637f65465c953991481f9cc6a422abbf64531f5bc51a0138e51bbff5c447'],
});

/** 严格替换唯一源片段，源布局变化时拒绝静默丢失校验。 */
function replaceOnce(text, oldText, newText, label) {
  if (text.split(oldText).length !== 2) throw new Error(`语言迁移源片段缺失或重复：${label}`);
  return text.replace(oldText, newText);
}

/** 仅为白名单目标应用语言适配；源文件摘要漂移时必须重新审计。 */
export function adaptProjectLocales(buffer, { stack, sourcePath, destination, repositoryRoot, sourceBuffer = buffer } = {}) {
  const authored = AUTHORED[sourcePath];
  if (authored) {
    const actual = createHash('sha256').update(sourceBuffer).digest('hex');
    if (actual !== authored[1]) throw new Error(`Unity 字体源摘要漂移：${sourcePath}`);
    return { buffer: readFileSync(resolve(repositoryRoot, 'scripts/migration/templates', authored[0])), changed: true };
  }
  const name = sourcePath?.split('/').at(-1);
  let text = buffer.toString('utf8');
  let output = text;
  if (stack === 'cocos' && sourcePath === 'skills/cocos-game-qa-performance/scripts/responsive-visual-validation.test.mjs' && destination === sourcePath) {
    // 引用式布局新增语言合同后，QA 测试必须使用真实来源并验证缺失路径，不能弱化文件门。
    const actual = createHash('sha256').update(sourceBuffer).digest('hex');
    if (actual !== '648dcee6f13356bafc02952b5b0349ed2db7317d6cfa69911b29c15c610b9239') throw new Error(`Cocos 响应式测试源摘要漂移：${sourcePath}`);
    // 统一匹配片段后恢复来源的换行风格，保证跨平台迁移结果与目标字节一致。
    const lineEnding = output.includes('\r\n') ? '\r\n' : '\n';
    output = output.replaceAll('\r\n', '\n');
    output = replaceOnce(output, 'import { mkdir, writeFile } from "node:fs/promises";', 'import { mkdir, unlink, writeFile } from "node:fs/promises";', sourcePath);
    output = replaceOnce(output, '    [scenePath, scene],\n    [nodesPath, layoutSourceDocuments.get(nodesPath)],', '    [scenePath, scene],\n    [document.localization_contract_file, structuredClone(ordinaryUiTemplate)],\n    [nodesPath, layoutSourceDocuments.get(nodesPath)],', sourcePath);
    output = replaceOnce(output, '  const brokenSources = new Map(fixture.sources);\n  brokenSources.set', '  const brokenSources = new Map(fixture.sources);\n  const missingLocalization = new Map(fixture.sources);\n  missingLocalization.delete(fixture.document.localization_contract_file);\n  const missing = normalizeContract(fixture.document, { stage: "V2", layoutSourceDocuments: missingLocalization });\n  assert.equal(missing.identityContract.trusted, false);\n  assert(missing.identityContract.validationErrors.some((item) => item.includes(fixture.document.localization_contract_file)));\n  brokenSources.set', sourcePath);
    output = replaceOnce(output, '  await assert.rejects(loadResponsiveContract(fixture.document), /必须显式提供 projectRoot/);', '  await assert.rejects(loadResponsiveContract(fixture.document), /必须显式提供 projectRoot/);\n  await unlink(join(root, fixture.document.localization_contract_file));\n  await assert.rejects(loadResponsiveContract(fixture.document, { stage: "V2", projectRoot: root }), /localization_contract_file 文件不存在或无法解析/);', sourcePath);
    output = output.replaceAll('\n', lineEnding);
  } else if (stack === 'unity' && name === 'work-item.schema.json' && destination === 'skills/unity-domain-contracts/schemas/work-item.schema.json') {
    const schema = JSON.parse(text);
    const fields = schema.$defs?.textLocalization?.properties;
    if (!fields?.locales?.prefixItems || !fields.localePolicies?.properties) throw new Error('Unity 语言 Schema 源结构漂移');
    fields.locales = { type: 'array', minItems: 1, uniqueItems: true, items: { type: 'string', pattern: '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$' } };
    fields.localePolicies = { type: 'object', additionalProperties: { $ref: '#/$defs/localePolicy' }, propertyNames: { pattern: '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$' } };
    output = `${JSON.stringify(schema, null, 2)}\n`;
  } else if (stack === 'unity' && name === 'visible-contract.mjs' && destination === 'skills/unity-domain-contracts/scripts/runtime/visible-contract.mjs') {
    output = output.replaceAll('\r\n', '\n');
    output = replaceOnce(output, "/** 程序化文本必须覆盖且只能覆盖的语言集合。 */\nexport const PROGRAMMATIC_TEXT_LOCALES = Object.freeze(['en', 'zh-CN', 'ja', 'ru', 'es']);\n\n", '', sourcePath);
    output = replaceOnce(output, "if (JSON.stringify(text.locales) !== JSON.stringify(PROGRAMMATIC_TEXT_LOCALES)) errors.push(contractError(scope, '程序化文本 locales 必须精确为 en、zh-CN、ja、ru、es'));", "const locales = Array.isArray(text.locales) ? text.locales : [];\n      if (!locales.length || locales.some((locale) => !nonEmptyString(locale) || !/^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/.test(locale)) || new Set(locales.map((locale) => String(locale).toLowerCase())).size !== locales.length) errors.push(contractError(scope, '程序化文本 locales 必须非空，且语言标识合法、不重复'));", sourcePath);
    output = replaceOnce(output, 'new Set(PROGRAMMATIC_TEXT_LOCALES)', 'new Set(locales)', sourcePath);
    output = replaceOnce(output, 'of PROGRAMMATIC_TEXT_LOCALES)', 'of locales)', sourcePath);
  } else if (stack === 'unity' && name === 'control-model.md' && destination === 'skills/unity-domain-contracts/references/control-model.md') {
    output = replaceOnce(output, '`locales` 必须精确为 `en`、`zh-CN`、`ja`、`ru`、`es`', '`locales` 记录项目已确认的语言清单；新项目默认中文并可选其他语言，既有项目沿用已确认清单', sourcePath);
  }
  return { buffer: output === text ? buffer : Buffer.from(output, 'utf8'), changed: output !== text };
}

/** 在任何迁移输出前核验所有语言适配，避免一半写入后才发现源或模板漂移。 */
export function assertProjectLocaleAdaptablePlans(plans, sharedWorkflowPlan, { readText, transformShared, transformText, repositoryRoot }) {
  for (const plan of plans) {
    for (const item of plan.entries.values()) {
      if (!item.destination || item.referenceRedirect) continue;
      const sourceBuffer = plan.sourceBuffers.get(item.sourcePath);
      const text = readText(sourceBuffer, item.sourcePath);
      let buffer = sourceBuffer;
      if (text !== null) {
        const entry = { ...item, transforms: [...item.transforms] };
        const shared = transformShared(text, plan, entry, sharedWorkflowPlan);
        buffer = Buffer.from(transformText(shared.text, entry, plan.stack, plan.sourceFiles, plan.entries).text, 'utf8');
      }
      adaptProjectLocales(buffer, { stack: plan.stack, sourcePath: item.sourcePath, destination: item.destination, sourceBuffer, repositoryRoot });
    }
  }
}
