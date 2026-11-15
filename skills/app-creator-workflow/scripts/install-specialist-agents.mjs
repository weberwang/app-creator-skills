#!/usr/bin/env node
import { existsSync, lstatSync, fstatSync, mkdirSync, mkdtempSync, rmdirSync, linkSync, openSync, closeSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDirectEntry } from '../../app-skill-runtime/direct-entry.mjs';

/** 两类专属职责共用现有流程，不替换宿主的通用角色。 */
export const SPECIALIST_AGENTS = Object.freeze(['app_level_scene_designer', 'app_3d_model_creator']);
const SOURCE = resolve(dirname(fileURLToPath(import.meta.url)), '../agents');

/** 项目和配置祖先不能经链接重定向到其他位置。 */
function assertNoLinks(path) {
  for (let cursor = resolve(path);;) {
    try { if (lstatSync(cursor).isSymbolicLink()) throw new Error(`代理配置路径不能包含链接：${cursor}`); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const parent = dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
}

/** 同名自定义配置拒绝覆盖；已安装的相同配置可直接复用。 */
function inspectTarget(path, bytes) {
  assertNoLinks(path);
  if (!existsSync(path)) return false;
  const stat = lstatSync(path, { bigint: true });
  if (!stat.isFile() || stat.nlink !== 1n || !readFileSync(path).equals(bytes)) throw new Error(`同名代理配置冲突，已保留原文件：${path}`);
  return true;
}

/** 完整写入私有暂存文件后独占发布，磁盘写入失败不会留下可加载的半份 TOML。 */
function publishProfile(destination, item, created) {
  const staging = mkdtempSync(join(destination, '.app-creator-stage-'));
  const path = join(staging, 'profile.tmp');
  let handle;
  let identity;
  try {
    handle = openSync(path, 'wx');
    identity = fstatSync(handle, { bigint: true });
    writeFileSync(handle, item.bytes);
    closeSync(handle);
    handle = undefined;
    // 硬链接发布不会覆盖竞态中新出现的目标，且公开名称只看到完整内容。
    linkSync(path, item.path);
    created.push({ ...item, stat: identity });
  } finally {
    if (handle !== undefined) closeSync(handle);
    if (identity && existsSync(path)) {
      const stat = lstatSync(path, { bigint: true });
      const content = readFileSync(path);
      if (!stat.isSymbolicLink() && stat.isFile() && stat.dev === identity.dev && stat.ino === identity.ino && content.equals(item.bytes.subarray(0, content.length))) unlinkSync(path);
    }
    rmdirSync(staging);
  }
}

/** 显式激活项目级角色，不修改全局配置、模型、权限或 MCP 设置。 */
export function installSpecialistAgents({ projectRoot }) {
  const project = resolve(projectRoot);
  assertNoLinks(project);
  if (!existsSync(project) || !lstatSync(project).isDirectory()) throw new Error('目标项目必须是已有普通目录');
  const destination = join(project, '.codex', 'agents');
  assertNoLinks(destination);
  const plan = SPECIALIST_AGENTS.map((name) => {
    const source = join(SOURCE, `${name}.toml`);
    assertNoLinks(source);
    const bytes = readFileSync(source);
    const path = join(destination, `${name}.toml`);
    return { name, path, bytes, exists: inspectTarget(path, bytes) };
  });
  mkdirSync(destination, { recursive: true });
  const lock = join(destination, '.app-creator-specialists.lock');
  let handle;
  try { handle = openSync(lock, 'wx'); }
  catch (error) { if (error.code === 'EEXIST') throw new Error('代理配置激活正在进行或遗留锁尚未处理'); throw error; }
  // NTFS 文件标识可能超过安全整数，回滚与解锁使用完整精度比较。
  const lockIdentity = fstatSync(handle, { bigint: true });
  const created = [];
  try {
    // 取得锁后再完整预检，任一同名冲突都不能留下另一角色的部分激活。
    for (const item of plan) item.exists = inspectTarget(item.path, item.bytes);
    for (const item of plan.filter((entry) => !entry.exists)) {
      publishProfile(destination, item, created);
    }
    return { installed: created.map((item) => item.name), reused: plan.filter((item) => item.exists).map((item) => item.name) };
  } catch (error) {
    // 只撤销本次创建且身份和内容仍未变化的文件，不删除并发用户改动。
    for (const item of created.reverse()) {
      try {
        assertNoLinks(item.path);
        const stat = lstatSync(item.path, { bigint: true });
        if (stat.isFile() && stat.nlink === 1n && stat.dev === item.stat.dev && stat.ino === item.stat.ino && readFileSync(item.path).equals(item.bytes)) unlinkSync(item.path);
      } catch { /* 有冲突时保留现场，不扩大清理范围。 */ }
    }
    throw error;
  } finally {
    closeSync(handle);
    const current = lstatSync(lock, { bigint: true });
    if (current.isFile() && !current.isSymbolicLink() && current.nlink === 1n && current.dev === lockIdentity.dev && current.ino === lockIdentity.ino) unlinkSync(lock);
    else throw new Error('激活锁已被其他写者修改，保留现场');
  }
}

if (isDirectEntry(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 2 || args[0] !== '--project' || !args[1]) throw new Error('用法：node install-specialist-agents.mjs --project <项目根目录>');
    console.log(JSON.stringify(installSpecialistAgents({ projectRoot: args[1] }), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
