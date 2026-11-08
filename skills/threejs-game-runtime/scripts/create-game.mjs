#!/usr/bin/env node
import { isDirectEntry } from "../../app-skill-runtime/direct-entry.mjs";
import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** 新项目可先安装技能或初始化 Git；这些本地元数据不能被当作已有业务文件。 */
function assertEmptyProject(destination) {
  if (!existsSync(destination)) return;
  const root = lstatSync(destination);
  if (!root.isDirectory() || root.isSymbolicLink()) throw new Error('目标目录必须是普通目录');
  const allowed = new Set(['.agents', '.git', '.gitignore']);
  for (const entry of readdirSync(destination, { withFileTypes: true })) {
    const name = process.platform === 'win32' ? entry.name.toLowerCase() : entry.name;
    if (!allowed.has(name)) throw new Error('目标目录必须为空或仅包含 .agents、Git 元数据及 .gitignore');
    // 不跟随本地元数据链接，也不在生成工程时覆盖用户已有的忽略文件。
    if (entry.isSymbolicLink() || (name === '.agents' && !entry.isDirectory()) || (name === '.gitignore' && !entry.isFile())) {
      throw new Error(`本地元数据不是预期的普通文件或目录：${entry.name}`);
    }
  }
}

/** 复制最小工程并复用同一运行模块，保留本地工具和 Git 元数据，拒绝覆盖业务工程。 */
export function createGame(target) {
  const destination = resolve(target);
  assertEmptyProject(destination);
  mkdirSync(destination, { recursive: true });
  const scripts = dirname(fileURLToPath(import.meta.url));
  cpSync(join(scripts, '../assets/starter'), destination, { recursive: true, force: false, errorOnExist: true });
  cpSync(join(scripts, 'game-runtime.mjs'), join(destination, 'src/game-runtime.mjs'), { force: false, errorOnExist: true });
  return destination;
}

// npm 的 bin 链接与源模块路径可能不同，按真实文件身份判断直接执行。
if (isDirectEntry(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 1 || args[0].startsWith('-')) throw new Error('用法：node create-game.mjs <空目录>');
    console.log('已创建 three.js 游戏工程：' + createGame(args[0]));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
