/** 验证显示元素新增与修改的 V0 公共约束分发到声明视觉能力的安装结果。 */
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { installSkills, SOURCE_ROOT, STACKS } from '../packages/installer/install-project-skills.mjs';
import { extractMarkdownSection } from '../skills/app-skill-runtime/native-contracts.mjs';

const RULE = 'app-domain-toolkit/references/reference-domain-display-ownership.md';
const SECTION = '新增显示元素的增量约束';
const PROTOCOL = 'app-creator-workflow/references/professional-execution.md';
const WORKFLOW = 'app-creator-workflow/references/workflow.md';
const CAPABILITIES = ['app-gameplay-development', 'app-ui-layout', 'app-feedback', 'app-asset-workflow'];

/** 核对真实 Markdown 链接的文件与锚点，避免规则存在却未从任务入口接线。 */
function requireLink(root, source, target, section = '') {
  const sourcePath = join(root, source);
  const text = readFileSync(sourcePath, 'utf8');
  const linked = [...text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].some(([, href]) => {
    const [path, fragment = ''] = href.split('#');
    return resolve(dirname(sourcePath), path) === resolve(root, target) && fragment === section;
  });
  assert.ok(linked, `${source} 未直接链接 ${target}#${section}`);
  return extractMarkdownSection(readFileSync(join(root, target), 'utf8'), section);
}

for (const stack of STACKS) {
  /** 实际安装后检查共享入口链，规则无需复制到每个原生手册才能适用于本栈。 */
  test(`${stack} 按能力声明验证显示增量约束和安装边界`, (t) => {
    const project = mkdtempSync(join(tmpdir(), `display-increment-${stack}-`));
    // 仅回收独占临时项目，安装不启动开发服务、引擎或真实设备。
    t.after(() => rmSync(project, { recursive: true, force: true }));
    installSkills({ projectRoot: project, stacks: [stack] });
    const root = join(project, '.agents/skills');
    const profile = JSON.parse(readFileSync(join(root, `app-stack-${stack}/profile.json`), 'utf8'));
    const visualCapabilities = ['app-ui-layout', 'app-feedback'];
    if (visualCapabilities.every((name) => !profile.capabilitySkills.includes(name))) {
      // 无界面技术栈只验证能力边界，不要求伪造显示节点或视觉工作项。
      for (const name of visualCapabilities) {
        assert.equal(profile.capabilitySkills.includes(name), false);
        assert.equal(existsSync(join(root, name)), false);
      }
      return;
    }
    const expected = extractMarkdownSection(readFileSync(join(SOURCE_ROOT, 'skills', RULE), 'utf8'), SECTION);
    const sources = ['app-creator-workflow/SKILL.md', PROTOCOL, WORKFLOW];
    if (profile.capabilitySkills.includes('app-feedback')) sources.push('app-feedback/references/interaction-feedback.md');
    else assert.equal(existsSync(join(root, 'app-feedback')), false);
    for (const source of sources) {
      assert.equal(requireLink(root, source, RULE, SECTION), expected);
    }
    for (const capability of CAPABILITIES.filter((name) => profile.capabilitySkills.includes(name))) {
      requireLink(root, `${capability}/SKILL.md`, PROTOCOL);
    }
  });
}
