/** 验证 Node.js 服务端独立安装的能力闭包和非视觉控制器入口。 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { installSkills } from '../packages/installer/install-project-skills.mjs';

/** 仅删除当前测试在系统临时目录中创建的独占目录。 */
function removeFixture(project) {
  const absolute = resolve(project);
  if (dirname(absolute) !== resolve(tmpdir()) || !basename(absolute).startsWith('app-creator-nodejs-')) {
    throw new Error('临时测试目录越界，拒绝清理');
  }
  rmSync(absolute, { recursive: true, force: true });
}

test('Node.js 独立安装只加载服务端能力并可初始化非视觉工作项', async (t) => {
  const project = mkdtempSync(join(tmpdir(), 'app-creator-nodejs-'));
  t.after(() => removeFixture(project));
  const preview = installSkills({ projectRoot: project, stacks: ['nodejs'], dryRun: true });
  assert.equal(preview.changed, false);
  assert.equal(existsSync(join(project, '.agents')), false);
  installSkills({ projectRoot: project, stacks: ['nodejs'] });

  const skills = join(project, '.agents', 'skills');
  const profile = JSON.parse(readFileSync(join(skills, 'app-stack-nodejs', 'profile.json'), 'utf8'));
  assert.equal(profile.id, 'nodejs');
  assert.ok(Array.isArray(profile.nativeAdapters) && profile.nativeAdapters.length > 0);
  for (const capability of ['app-architecture', 'app-project-foundation', 'app-quality-review', 'app-release']) {
    assert.ok(profile.capabilitySkills.includes(capability), `缺少服务端必要能力 ${capability}`);
    assert.ok(profile.nativeAdapters.some((route) => route.capability === capability), `${capability} 缺少原生路由`);
  }
  for (const stack of ['unity', 'cocos', 'phaser', 'threejs', 'flutter', 'esp32']) {
    assert.equal(existsSync(join(skills, `app-stack-${stack}`)), false, `不能附带安装 ${stack} 栈`);
  }
  for (const capability of ['app-ui-layout', 'app-feedback']) {
    assert.equal(existsSync(join(skills, capability)), false, `服务端安装不能附带 ${capability}`);
    assert.equal(profile.capabilitySkills.includes(capability), false);
  }

  // 直接使用安装后的读取器，避免开发仓库的资源掩盖安装闭包缺失。
  const { loadNativeMode } = await import(pathToFileURL(join(skills, 'app-skill-runtime', 'read-native-mode.mjs')).href);
  for (const route of profile.nativeAdapters) {
    const result = loadNativeMode({ stack: 'nodejs', capability: route.capability, sourceSkill: route.sourceSkill, skillsRoot: skills });
    assert.equal(result.sourceSkill, route.sourceSkill);
    const native = result.documents.filter((document) => document.kind === 'native');
    assert.equal(native.length, 1, route.sourceSkill);
    assert.equal(native[0].path, 'app-stack-nodejs/references/native-contracts.md');
    assert.equal(native[0].section, route.section);
    assert.ok(native[0].content.trim(), route.sourceSkill);
    assert.ok(result.documents.every((document) => !/^app-stack-(unity|cocos|phaser|threejs|flutter|esp32)\//.test(document.path)));
  }

  // 真实调用已安装的控制器，验证后端无需视觉插件即可建立模块工作项。
  const cli = join(skills, 'app-workflow-control', 'scripts', 'workflow-control.mjs');
  /** 为显示层补全合法宿主输入，确保拒绝来自技术栈约束而非缺少参数。 */
  const invoke = (type, id) => {
    const args = [cli, 'init', '--repo', project, '--stack', 'nodejs', '--id', id, '--type', type, '--objective', '验证服务端工作项'];
    if (type === 'DISPLAY_LAYER') args.push('--host-id', 'home', '--layer-type', 'modal');
    return spawnSync(process.execPath, args, { cwd: project, encoding: 'utf8', timeout: 20000, windowsHide: true });
  };
  const module = invoke('MODULE', 'api');
  assert.equal(module.error, undefined, module.error?.message);
  assert.equal(module.status, 0, module.stderr);
  const work = JSON.parse(readFileSync(join(project, '.workflow-control', 'work-items', 'api.json'), 'utf8'));
  assert.equal(work.stack, 'nodejs');
  assert.equal(work.workItemType, 'MODULE');
  assert.equal(work.visualBaselineRequired, false);
  assert.equal(work.visual, undefined);
  for (const type of ['SCENE', 'PAGE', 'DISPLAY_LAYER']) {
    const id = type.toLowerCase().replaceAll('_', '-');
    const result = invoke(type, id);
    assert.equal(result.error, undefined, result.error?.message);
    assert.notEqual(result.status, 0, `${type} 不能用于无界面服务端`);
    assert.equal(existsSync(join(project, '.workflow-control', 'work-items', `${id}.json`)), false);
  }
});
