/** 验证跨栈建模正文合并的源追溯和原生规则保留。 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildModelingWorkflowFamily, splitModelingBlocks } from '../scripts/migration/modeling-workflow-family.mjs';
import { applySharedWorkflowSections } from '../scripts/migration/shared-workflows.mjs';

const SOURCE_PATHS = Object.freeze({
  unity: 'unity-game-3d-modeling/SKILL.md',
  cocos: 'skills/cocos-game-3d-modeling/SKILL.md',
  threejs: 'skills/threejs-game-3d-modeling/SKILL.md',
});

/** 创建包含共同工作步骤及栈原生边界的隔离源仓库夹具。 */
function makeFixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'modeling-workflow-'));
  const sourceRoot = {};
  const bodies = {
    unity: '---\nname: unity-game-3d-modeling\n---\n# Unity建模\n\n## 输入\n\n- 要求已有 Visual Bible、用途、观看距离、单位、轴向、Pivot、拓扑/面数预算、材质槽、LOD、碰撞和许可。\n\n## Blender\n\n1. 先发现可复用的 Blender 实例和 MCP 工具，核对活动文件及未保存状态。\n\n3. 本地已有模型可作为只读输入，在 Blender MCP 内审计与修整。\n\n## 场景\n\n2. 在 Blender 中确定轮廓、比例与结构，可用 blockout 作为中间检查；它不是正式资源。\n\n3. 按资产需要执行硬表面结构建模或有机雕刻，落实厚度、连接、转折、倒角与曲面；需要高低模时完成高模及重拓扑，直接低模路线也须有合理边流。\n\n4. 完成拓扑清理、法线/切线策略、UV 展开与检查，冻结实际 UV 位置与报告、材质槽及烘焙交接信息。按预算制作 LOD 和碰撞代理。\n\n5. 保存版本化源与可复现模型配方，记录工具版本、关键操作、参数、实际源文件位置及派生关系。在独立导出副本上处理修改器、三角化和轴向，回读导出结果。\n\n- 基础几何体仅可作为起始网格、中间 blockout 或碰撞代理。\n\n- 不以增加分段、细分、堆叠零件或光滑着色替代结构建模。\n\n6. Unity ModelImporter、LODGroup 和 Prefab 保持原生。\n',
    cocos: '---\nname: cocos-game-3d-modeling\n---\n# Cocos建模\n\n## 输入与边界\n\n- 输入应明确模型用途、观看距离、单位、坐标、Pivot、拓扑/面数预算、材质槽、LOD、碰撞和许可。\n\n- Blockout 可用于比例、轮廓和玩法空间检查，但不能作为正式模型交付。\n\n## 执行\n\n1. 用 Blender MCP 的实时工具能力检查并制作模型，保存版本化源、操作记录和正式导出；导出后回读实际对象、网格、UV、材质槽、变换与预算。\n\n2. 正式网格按规格完成轮廓和结构、拓扑清理、法线/切线策略、UV 检查及适用的 LOD 与碰撞代理；不能用贴图掩盖未完成几何。\n\n3. 源资产只读；仅在授权路径创建版本化派生文件。\n\n4. Creator AssetDB、UUID 与 MCP 导入保持原生。\n',
    threejs: '---\nname: threejs-game-3d-modeling\n---\n# Three建模\n\n## 职责\n\n- 本技能负责静态网格形体、结构、拓扑、法线策略、实际 UV 报告、材质槽，以及按需 LOD 与碰撞代理。Blockout 只用于比例或轮廓讨论，不能作为正式模型。\n\n- GLTFLoader、GLB、InstancedMesh 和 world projection 属于 Three.js 原生管线。\n',
  };
  for (const [stack, sourcePath] of Object.entries(SOURCE_PATHS)) {
    sourceRoot[stack] = path.join(root, stack + '-skills');
    const target = path.join(sourceRoot[stack], ...sourcePath.split('/'));
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, bodies[stack], 'utf8');
  }
  return { root, sourceRoot, bodies };
}

/** 清理每项测试创建的临时源码树。 */
function cleanFixture(fixture) {
  rmSync(fixture.root, { recursive: true, force: true });
}

/** 使用共享路由器同样的规则计算 Markdown 标题锚点。 */
function headingAnchor(heading) {
  return heading.toLocaleLowerCase('en-US').replace(/[^\p{L}\p{N}\s_-]/gu, '').trim().replace(/\s+/g, '-');
}

test('完整三栈建模步骤收敛到一个可追溯公共正文', () => {
  const fixture = makeFixture();
  try {
    const plan = buildModelingWorkflowFamily(fixture);
    const document = plan.documents[0];
    const documentPath = path.join(fixture.root, ...document.path.split('/'));
    mkdirSync(path.dirname(documentPath), { recursive: true });
    writeFileSync(documentPath, document.content, 'utf8');
    assert.equal(document.capabilityId, 'modeling-production');
    assert.deepEqual(new Set(document.sources.map((source) => source.stack)), new Set(['unity', 'cocos', 'threejs']));
    assert.match(document.content, /厚度、连接、转折、倒角和曲面/);
    assert.match(document.content, /高模与重拓扑/);
    assert.match(document.content, /法线与切线策略、UV 展开与检查，冻结实际 UV 位置及报告/);
    assert.match(document.content, /LOD 和碰撞代理/);
    assert.match(document.content, /独立副本上应用修改器、三角化或轴向调整/);
    assert.match(document.content, /重新打开并读取真实导出物/);
    assert.match(document.content, /已批准的视觉基线（如 Unity Visual Bible）/);
    assert.match(document.content, /只有确认无可复用实例后才启动/);
    assert.match(document.content, /冻结实际 UV 位置及报告、材质槽和烘焙交接信息/);
    assert.doesNotMatch(document.content, /ModelImporter|LODGroup|AssetDB|UUID|GLTFLoader|InstancedMesh|world projection/);
    const sourceRanges = plan.replacements.map((item) => [item.stack, item.sourcePath, item.sourceRange.start, item.sourceRange.end].join(':'));
    assert.equal(new Set(sourceRanges).size, sourceRanges.length);
    for (const sourcePlan of document.sources) {
      const source = fixture.bodies[sourcePlan.stack];
      const adapter = SOURCE_PATHS[sourcePlan.stack].replace('SKILL.md', 'SKILL.md').replace(/^unity-game-3d-modeling/, 'skills/unity-game-3d-modeling');
      const transformed = applySharedWorkflowSections(source, {
        stack: sourcePlan.stack,
        sourcePath: sourcePlan.sourcePath,
        destination: adapter,
        repositoryRoot: fixture.root,
        plan,
      });
      assert.match(transformed.text, /通用工作流步骤见\[完整规范\]/);
      const href = transformed.text.match(/\[完整规范\]\(([^)]+)\)/)?.[1];
      assert.ok(href);
      const target = path.resolve(path.dirname(path.join(fixture.root, ...adapter.split('/'))), href.split('#')[0]);
      assert.equal(target, documentPath);
      const linkedHeading = decodeURIComponent(href.split('#')[1]);
      assert.ok(document.content.split(/\r?\n/).some((line) => {
        const heading = line.match(/^#{1,6}\s+(.+?)\s*#*\s*$/)?.[1];
        return heading && headingAnchor(heading) === linkedHeading;
      }), '公共链接锚点必须命中实际生成的标题');
      if (sourcePlan.stack === 'unity') assert.match(transformed.text, /Unity ModelImporter、LODGroup 和 Prefab/);
      if (sourcePlan.stack === 'cocos') assert.match(transformed.text, /Creator AssetDB、UUID 与 MCP 导入保持原生/);
      if (sourcePlan.stack === 'threejs') assert.match(transformed.text, /GLTFLoader、GLB、InstancedMesh 和 world projection/);
      for (const section of sourcePlan.sections) {
        const replacement = plan.replacements.find((item) => item.stack === sourcePlan.stack && item.sourceRange.start === section.sourceRange.start);
        assert.ok(replacement);
        assert.equal(source.slice(section.sourceRange.start, section.sourceRange.end).trim(), replacement.original);
        const expectedHash = createHash('sha256').update(replacement.original.trim().replaceAll('\r\n', '\n')).digest('hex');
        assert.equal(section.sourceHash, expectedHash);
        assert.ok(document.content.includes(replacement.canonical));
      }
    }
  } finally {
    cleanFixture(fixture);
  }
});

test('选择器漂移会停止迁移，原生规则留在各自技能', () => {
  const fixture = makeFixture();
  try {
    const target = path.join(fixture.sourceRoot.unity, ...SOURCE_PATHS.unity.split('/'));
    const original = readFileSync(target, 'utf8');
    writeFileSync(target, original.replace('Visual Bible', 'Changed source selector'), 'utf8');
    assert.throws(() => buildModelingWorkflowFamily(fixture), /源块漂移/);
    assert.match(fixture.bodies.cocos, /Creator AssetDB/);
    assert.match(fixture.bodies.unity, /Unity ModelImporter/);
    assert.match(fixture.bodies.threejs, /GLTFLoader/);
  } finally {
    cleanFixture(fixture);
  }
});

test('技能正文按列表项切分并保留准确的原文区间', () => {
  const fixture = makeFixture();
  try {
    const source = fixture.bodies.unity;
    const selected = splitModelingBlocks(source).find((block) => block.original.startsWith('3. 按资产需要执行'));
    assert.ok(selected);
    assert.equal(source.slice(selected.sourceRange.start, selected.sourceRange.end), selected.original);
    assert.ok(selected.sourceHeading === '场景');
  } finally {
    cleanFixture(fixture);
  }
});
