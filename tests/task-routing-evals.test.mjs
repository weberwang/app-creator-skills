/** 检查自然语言路由用例及已安装的技能入口，语义选择由实际代理单独评估。 */
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { installSkills, SOURCE_ROOT, STACKS } from '../packages/installer/install-project-skills.mjs';
import { extractMarkdownSection } from '../skills/app-skill-runtime/native-contracts.mjs';

/** 评估样本集与覆盖类型。 */
const cases = JSON.parse(readFileSync(new URL('./fixtures/task-routing-cases.json', import.meta.url), 'utf8'));
const kinds = ['direct', 'near-miss', 'combo', 'none'];
const entryPath = 'app-creator-workflow/SKILL.md';
const routingPath = 'app-creator-workflow/references/task-routing.md';

/** 校验用例的身份、覆盖与期望的一致性，拼写错误不能被当作有效负例。 */
function validateCases() {
  assert.equal(new Set(cases.map(({ id }) => id)).size, cases.length);
  assert.deepEqual(new Set(cases.map(({ kind }) => kind)), new Set(kinds));
  assert.deepEqual(new Set(cases.flatMap(({ expected }) => expected.stack ?? [])), new Set(STACKS));
  for (const { id, kind, stacks, evidence, prompt, expected } of cases) {
    const { stack, mode, primary, required, excluded } = expected;
    assert.match(id, /^[a-z0-9]+(?:-[a-z0-9]+)+$/);
    assert.ok(evidence.trim() && prompt.trim(), `${id} 缺少项目线索或请求`);
    assert.ok(stacks.length && stacks.every((item) => STACKS.includes(item)), `${id} 的安装技术栈无效`);
    assert.equal(new Set(stacks).size, stacks.length, `${id} 的安装技术栈有重复`);
    if (kind === 'none') {
      assert.deepEqual([stack, mode, primary, required], [null, 'direct', null, []], `${id} 应直接处理`);
    } else {
      assert.ok(stacks.includes(stack), `${id} 的目标栈须已安装`);
      assert.ok(['light', 'standard'].includes(mode) && primary, `${id} 缺少编排模式或主能力`);
    }
    const capabilities = [...(primary ? [primary] : []), ...required, ...excluded];
    assert.equal(new Set(capabilities).size, capabilities.length, `${id} 重复声明能力或期望互斥`);
    for (const capability of capabilities) {
      assert.match(capability, /^app-[a-z0-9]+(?:-[a-z0-9]+)*$/);
      assert.ok(existsSync(join(SOURCE_ROOT, 'skills', capability, 'SKILL.md')), `${id} 引用未知能力 ${capability}`);
    }
    if (kind === 'combo') assert.ok(required.length > 0, `${id} 缺少必须协作的能力`);
    if (kind === 'near-miss') assert.ok(excluded.length > 0, `${id} 缺少应避开的能力`);
  }
}

/** 通过真实安装产物验证工作流中的两条按需路由。 */
function checkRoutingEntry(root) {
  const entry = readFileSync(join(root, entryPath), 'utf8');
  const routing = readFileSync(join(root, routingPath), 'utf8');
  for (const section of ['stack-evidence', 'task-ownership']) {
    assert.ok(entry.includes(`(references/task-routing.md#${section})`), `统一入口缺少路由链接 ${section}`);
    assert.ok(extractMarkdownSection(routing, section).trim(), `路由参考缺少目标章节 ${section}`);
  }
}

/** 从安装目录读取能力并解析当前栈的原生章节，防止源码环境掩盖交付缺失。 */
async function checkInstalledCapabilities(root, { stack, primary, required }) {
  if (!stack) return;
  const profile = JSON.parse(readFileSync(join(root, `app-stack-${stack}/profile.json`), 'utf8'));
  const { loadNativeMode } = await import(pathToFileURL(join(root, 'app-skill-runtime/read-native-mode.mjs')).href);
  for (const capability of [primary, ...required]) {
    assert.ok(profile.capabilitySkills.includes(capability), `${stack} 未声明能力 ${capability}`);
    assert.ok(existsSync(join(root, capability, 'SKILL.md')), `缺少已安装技能 ${capability}`);
    const manifest = JSON.parse(readFileSync(join(root, capability, 'native-adapters.json'), 'utf8'));
    const modes = manifest.adapters[stack];
    assert.ok(modes?.length, `${stack}/${capability} 缺少原生模式`);
    for (const { sourceSkill } of modes) {
      const result = loadNativeMode({ stack, capability, sourceSkill, skillsRoot: root });
      assert.equal(result.sourceSkill, sourceSkill);
    }
  }
}

test('自然语言路由用例可从目标安装组合读取', async (t) => {
  validateCases();
  const tempRoot = mkdtempSync(join(tmpdir(), 'app-creator-task-routing-'));
  // 清理范围限于本次新建的临时项目，不递归处理用户项目目录。
  t.after(() => {
    assert.equal(dirname(tempRoot), tmpdir());
    assert.ok(basename(tempRoot).startsWith('app-creator-task-routing-'));
    rmSync(tempRoot, { recursive: true, force: true });
  });
  const installations = new Map();
  for (const { id, stacks, expected } of cases) {
    await t.test(id, async () => {
      const key = [...stacks].sort().join('-');
      if (!installations.has(key)) {
        const projectRoot = join(tempRoot, key);
        mkdirSync(projectRoot);
        const { destination } = installSkills({ projectRoot, stacks });
        checkRoutingEntry(destination);
        installations.set(key, destination);
      }
      await checkInstalledCapabilities(installations.get(key), expected);
    });
  }
});
