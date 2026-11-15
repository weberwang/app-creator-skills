/** 验证角色随技能交付及项目激活，不启动设计、Blender 或生图任务。 */
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync, linkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import test from 'node:test';
import { installSkills, SOURCE_ROOT } from '../packages/installer/install-project-skills.mjs';
import { installSpecialistAgents, SPECIALIST_AGENTS } from '../skills/app-creator-workflow/scripts/install-specialist-agents.mjs';
import { extractMarkdownSection, markdownProse } from '../skills/app-skill-runtime/native-contracts.mjs';

const CANONICAL = join(SOURCE_ROOT, 'skills/app-creator-workflow/agents');

/** 只清理本测试在系统临时目录独占创建的项目。 */
function project(t) {
  const root = mkdtempSync(join(tmpdir(), 'specialist-agents-'));
  t.after(() => { assert.equal(dirname(resolve(root)), resolve(tmpdir())); rmSync(root, { recursive: true, force: true }); });
  return root;
}

test('两份项目配置与唯一维护源一致，继承宿主模型和权限', () => {
  for (const name of SPECIALIST_AGENTS) {
    const canonical = readFileSync(join(CANONICAL, `${name}.toml`), 'utf8');
    assert.equal(readFileSync(join(SOURCE_ROOT, '.codex/agents', `${name}.toml`), 'utf8'), canonical);
    assert.ok(canonical.includes(`name = "${name}"`));
    assert.match(canonical, /description = ".+"/);
    assert.match(canonical, /developer_instructions = """[\s\S]+"""/);
    assert.doesNotMatch(canonical, /^(model|model_reasoning_effort|sandbox_mode|approval_policy|mcp_servers)\s*=/m);
    assert.match(canonical, /人工/);
    assert.match(canonical, /唯一写者/);
    assert.match(canonical, /image_generator/);
  }
});

test('首次激活与重复激活均保留用户项目配置和无关角色', (t) => {
  const root = project(t);
  mkdirSync(join(root, '.codex/agents'), { recursive: true });
  const config = 'model = "user-choice"\r\n';
  writeFileSync(join(root, '.codex/config.toml'), config);
  writeFileSync(join(root, '.codex/agents/custom.toml'), '用户配置');
  assert.deepEqual(installSpecialistAgents({ projectRoot: root }).installed, [...SPECIALIST_AGENTS]);
  assert.deepEqual(installSpecialistAgents({ projectRoot: root }).reused, [...SPECIALIST_AGENTS]);
  assert.equal(readFileSync(join(root, '.codex/config.toml'), 'utf8'), config);
  assert.equal(readFileSync(join(root, '.codex/agents/custom.toml'), 'utf8'), '用户配置');
  assert.equal(existsSync(join(root, '.codex/agents/.app-creator-specialists.lock')), false);
});

test('任一角色冲突都在写入前拒绝，不留下另一份部分激活', (t) => {
  for (const name of SPECIALIST_AGENTS) {
    const root = project(t);
    mkdirSync(join(root, '.codex/agents'), { recursive: true });
    const path = join(root, '.codex/agents', `${name}.toml`);
    writeFileSync(path, '用户同名定制');
    assert.throws(() => installSpecialistAgents({ projectRoot: root }), /冲突/);
    assert.equal(readFileSync(path, 'utf8'), '用户同名定制');
    for (const other of SPECIALIST_AGENTS.filter((item) => item !== name)) assert.equal(existsSync(join(root, '.codex/agents', `${other}.toml`)), false);
  }
});

test('第二份写入中断不留下半份角色或部分激活', (t) => {
  const root = project(t);
  const original = fs.writeFileSync;
  let writes = 0;
  fs.writeFileSync = (path, bytes, ...options) => {
    if (typeof path === 'number' && ++writes === 2) {
      original(path, bytes.subarray(0, 9));
      throw new Error('模拟磁盘写入中断');
    }
    return original(path, bytes, ...options);
  };
  syncBuiltinESMExports();
  try { assert.throws(() => installSpecialistAgents({ projectRoot: root }), /写入中断/); }
  finally { fs.writeFileSync = original; syncBuiltinESMExports(); }
  for (const name of SPECIALIST_AGENTS) assert.equal(existsSync(join(root, '.codex/agents', `${name}.toml`)), false);
  assert.deepEqual(fs.readdirSync(join(root, '.codex/agents')), []);
});

test('链接祖先、硬链接目标及已有激活锁不能扩大写入范围', (t) => {
  const linked = project(t);
  const outside = project(t);
  symlinkSync(outside, join(linked, '.codex'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => installSpecialistAgents({ projectRoot: linked }), /链接/);
  assert.equal(existsSync(join(outside, 'agents')), false);
  const hard = project(t);
  mkdirSync(join(hard, '.codex/agents'), { recursive: true });
  const file = join(outside, 'source.toml');
  writeFileSync(file, readFileSync(join(CANONICAL, `${SPECIALIST_AGENTS[0]}.toml`)));
  linkSync(file, join(hard, '.codex/agents', `${SPECIALIST_AGENTS[0]}.toml`));
  assert.throws(() => installSpecialistAgents({ projectRoot: hard }), /冲突/);
  const locked = project(t);
  mkdirSync(join(locked, '.codex/agents'), { recursive: true });
  writeFileSync(join(locked, '.codex/agents/.app-creator-specialists.lock'), '另一个写者');
  assert.throws(() => installSpecialistAgents({ projectRoot: locked }), /正在进行/);
  assert.equal(existsSync(join(locked, '.codex/agents', `${SPECIALIST_AGENTS[0]}.toml`)), false);
});

test('单栈安装真实交付配置和独立激活入口，安装本身不改项目 Codex 配置', (t) => {
  const root = project(t);
  installSkills({ projectRoot: root, stacks: ['cocos'] });
  assert.equal(existsSync(join(root, '.codex')), false);
  const installed = join(root, '.agents/skills/app-creator-workflow');
  const command = spawnSync(process.execPath, [join(installed, 'scripts/install-specialist-agents.mjs'), '--project', root], { cwd: tmpdir(), encoding: 'utf8', windowsHide: true });
  assert.equal(command.status, 0, command.stderr);
  for (const name of SPECIALIST_AGENTS) assert.ok(readFileSync(join(root, '.codex/agents', `${name}.toml`)).equals(readFileSync(join(CANONICAL, `${name}.toml`))));
  const bad = spawnSync(process.execPath, [join(installed, 'scripts/install-specialist-agents.mjs'), '--force'], { encoding: 'utf8', windowsHide: true });
  assert.notEqual(bad.status, 0);
});

/** 解析已安装说明中的本地引用，同时验证目标文件和章节，防止源码可读而交付后断链。 */
function localReferences(source, selected) {
  const links = [];
  for (const match of markdownProse(readFileSync(source, 'utf8')).matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const href = match[1];
    if (/^[a-z][a-z0-9+.-]*:/i.test(href)) continue;
    const [path, fragment] = href.split('#');
    const target = path ? resolve(dirname(source), decodeURIComponent(path)) : source;
    // 单栈入口还列出其他栈索引；接线检查只验证指定依赖，角色说明则检查全部本地引用。
    if (selected && !selected.has(target)) continue;
    assert.ok(existsSync(target), `${source} 的引用未交付：${href}`);
    if (fragment) extractMarkdownSection(readFileSync(target, 'utf8'), decodeURIComponent(fragment));
    links.push(target);
  }
  return links;
}

test('三维各栈安装后从工作流和专业入口可到达真实角色及原阶段规范', async (t) => {
  for (const stack of ['cocos', 'unity', 'threejs']) {
    const root = project(t);
    installSkills({ projectRoot: root, stacks: [stack] });
    const base = join(root, '.agents/skills');
    const routing = join(base, 'app-creator-workflow/references/specialist-agents.md');
    for (const entry of [
      'app-creator-workflow/SKILL.md',
      'app-creator-workflow/references/handoffs.md',
      'app-domain-toolkit/references/game-design-exploration.md',
      'app-3d-modeling/SKILL.md',
    ]) assert.ok(localReferences(join(base, entry), new Set([routing])).includes(routing), `${stack} 的 ${entry} 未接入专属角色`);
    const targets = localReferences(routing);
    for (const name of SPECIALIST_AGENTS) assert.ok(targets.includes(join(base, 'app-creator-workflow/agents', `${name}.toml`)));
    assert.ok(targets.includes(join(base, 'app-domain-toolkit/references/game-design-exploration.md')));
    assert.ok(targets.includes(join(base, 'app-3d-modeling/SKILL.md')));
    assert.ok(targets.includes(join(base, 'app-creator-workflow/references/handoffs.md')));
    const installed = await import(pathToFileURL(join(base, 'app-creator-workflow/scripts/install-specialist-agents.mjs')).href);
    installed.installSpecialistAgents({ projectRoot: root });
    for (const name of SPECIALIST_AGENTS) assert.ok(readFileSync(join(root, '.codex/agents', `${name}.toml`)).equals(readFileSync(join(base, 'app-creator-workflow/agents', `${name}.toml`))));
  }
});
