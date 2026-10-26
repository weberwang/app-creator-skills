#!/usr/bin/env node

"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

/**
 * 执行 Git 命令并保留原始字节，避免含空格或非 ASCII 路径被 shell 改写。
 * @param {string[]} args Git 参数
 * @param {object} options 执行选项
 * @returns {Buffer} 标准输出
 */
function runGit(args, options) {
  const result = spawnSync("git", args, {
    cwd: options && options.cwd ? options.cwd : process.cwd(),
    input: options && options.input ? options.input : undefined,
    encoding: null,
    maxBuffer: 64 * 1024 * 1024,
  });

  if (result.error) {
    throw new Error(`无法执行 git：${result.error.message}`);
  }
  if (result.status !== 0) {
    const detail = result.stderr ? result.stderr.toString("utf8").trim() : "无 Git 错误输出";
    throw new Error(`git ${args.join(" ")} 失败：${detail}`);
  }
  return result.stdout || Buffer.alloc(0);
}

/**
 * 将命令行基线解析为提交对象，允许可剥离到提交的标签等引用，拒绝无法解析到提交的对象。
 * @param {string} root 仓库根目录
 * @param {string} baseRef 用户输入的基线引用
 * @returns {string} 解析后的完整提交 SHA
 */
function resolveBase(root, baseRef) {
  const expression = `${baseRef}^{commit}`;
  const output = runGit(["rev-parse", "--verify", expression], { cwd: root });
  const sha = output.toString("utf8").trim();
  if (!/^[0-9a-f]{40,64}$/i.test(sha)) {
    throw new Error(`基线引用不是有效提交：${baseRef}`);
  }
  return sha.toLowerCase();
}

/**
 * 解析 git diff --name-status -z，保留重命名的旧路径和新路径。
 * @param {Buffer} output Git 的 NUL 分隔输出
 * @returns {Array<{status:string,path:string,previousPath?:string}>} 变更记录
 */
function parseDiffRecords(output) {
  const tokens = output.toString("utf8").split("\0");
  const records = [];
  let index = 0;

  while (index < tokens.length) {
    const first = tokens[index++];
    if (!first) {
      continue;
    }
    const tab = first.indexOf("\t");
    let status;
    let firstPath;
    if (tab >= 0) {
      status = first.slice(0, tab);
      firstPath = first.slice(tab + 1);
    } else {
      status = first;
      firstPath = tokens[index++];
    }

    if (!status || firstPath === undefined) {
      throw new Error("无法解析 Git diff 的变更记录");
    }
    // 重命名/复制可能发生在索引列或工作树列，必须检查两列而不是只看第一列。
    const isRenameOrCopy = status[0] === "R" || status[1] === "R" || status[0] === "C" || status[1] === "C";
    if (isRenameOrCopy) {
      const newPath = tokens[index++];
      if (newPath === undefined || newPath === "") {
        throw new Error(`重命名记录缺少目标路径：${firstPath}`);
      }
      records.push({ status, path: newPath, previousPath: firstPath });
    } else {
      records.push({ status, path: firstPath });
    }
  }
  return records;
}

/**
 * 解析当前工作树状态，用于补充基线 diff 无法表达的未跟踪或冲突路径。
 * @param {Buffer} output git status --porcelain=v1 -z 输出
 * @returns {Array<{status:string,path:string,previousPath?:string}>} 状态记录
 */
function parseStatusRecords(output) {
  const tokens = output.toString("utf8").split("\0");
  const records = [];
  let index = 0;

  while (index < tokens.length) {
    const record = tokens[index++];
    if (!record) {
      continue;
    }
    if (record.length < 3) {
      throw new Error(`无法解析 Git status 记录：${record}`);
    }
    const status = record.slice(0, 2);
    const firstPath = record.slice(3);
    if (!firstPath) {
      throw new Error(`Git status 记录缺少路径：${record}`);
    }
    // 重命名/复制可能发生在索引列或工作树列，必须检查两列而不是只看第一列。
    const isRenameOrCopy = status[0] === "R" || status[1] === "R" || status[0] === "C" || status[1] === "C";
    if (isRenameOrCopy) {
      const previousPath = tokens[index++];
      if (previousPath === undefined || previousPath === "") {
        throw new Error(`重命名状态缺少旧路径：${firstPath}`);
      }
      records.push({ status, path: firstPath, previousPath });
    } else {
      records.push({ status, path: firstPath });
    }
  }
  return records;
}

/**
 * 判断路径是否仍在仓库根目录内，阻止异常路径读取仓库外文件。
 * @param {string} root 仓库根目录
 * @param {string} relativePath Git 相对路径
 * @returns {string} 规范化的绝对路径
 */
function resolveWorktreePath(root, relativePath) {
  const absolutePath = path.resolve(root, relativePath);
  const rootPrefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  if (absolutePath !== root && !absolutePath.startsWith(rootPrefix)) {
    throw new Error(`变更路径超出仓库根目录：${relativePath}`);
  }
  return absolutePath;
}

/**
 * 为当前工作树文件计算 Git blob ID；删除项返回 null，未跟踪文件同样参与哈希。
 * @param {string} root 仓库根目录
 * @param {string} relativePath Git 相对路径
 * @returns {string|null} blob ID 或空值
 */
function readBlobId(root, relativePath) {
  const absolutePath = resolveWorktreePath(root, relativePath);
  let stat;
  try {
    stat = fs.lstatSync(absolutePath);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return null;
    }
    throw new Error(`无法读取变更路径 ${relativePath}：${error.message}`);
  }

  if (stat.isDirectory()) {
    return null;
  }
  const bytes = stat.isSymbolicLink()
    ? Buffer.from(fs.readlinkSync(absolutePath), "utf8")
    : fs.readFileSync(absolutePath);
  const output = runGit(["hash-object", "--path", relativePath, "--stdin"], { cwd: root, input: bytes });
  const blobId = output.toString("utf8").trim();
  if (!/^[0-9a-f]{40,64}$/i.test(blobId)) {
    throw new Error(`Git 未返回有效 blob ID：${relativePath}`);
  }
  return blobId.toLowerCase();
}

/**
 * 按目标路径、旧路径和状态排序，保证不同平台得到相同记录顺序。
 * @param {object} left 左侧变更记录
 * @param {object} right 右侧变更记录
 * @returns {number} 排序结果
 */
function compareRecords(left, right) {
  const leftKey = `${left.path}\0${left.previousPath || ""}\0${left.status}`;
  const rightKey = `${right.path}\0${right.previousPath || ""}\0${right.status}`;
  // 使用 UTF-8 字节序，避免不同运行时的 ICU/locale 版本产生不同 snapshot。
  return Buffer.compare(Buffer.from(leftKey, "utf8"), Buffer.from(rightKey, "utf8"));
}

/**
 * 合并基线 diff 和工作树状态，避免未跟踪、冲突或仅工作树变化的路径遗漏。
 * @param {Array<object>} diffRecords 基线 diff 记录
 * @param {Array<object>} statusRecords 当前状态记录
 * @returns {Array<object>} 去重后的变更记录
 */
function mergeRecords(diffRecords, statusRecords) {
  const records = [];
  const keys = new Set();
  for (const record of diffRecords) {
    const key = `${record.path}\0${record.previousPath || ""}`;
    keys.add(key);
    records.push(record);
  }
  for (const record of statusRecords) {
    const key = `${record.path}\0${record.previousPath || ""}`;
    if (!keys.has(key) && (record.status.includes("?") || record.status.includes("U") || record.status.includes("A"))) {
      keys.add(key);
      records.push(record);
    }
  }
  records.sort(compareRecords);
  return records;
}

/**
 * 解析命令行参数，保证只接受一个可选的 --base <ref>。
 * @param {string[]} argv 原始参数
 * @returns {{baseRef:string}} 参数结果
 */
function parseArgs(argv) {
  let baseRef = "HEAD";
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--base") {
      if (!argv[index + 1] || argv[index + 1].startsWith("--")) {
        throw new Error("--base 需要一个提交、标签或其他可解析的 Git 引用");
      }
      baseRef = argv[index + 1];
      index += 1;
    } else {
      throw new Error(`未知参数：${argv[index]}；用法：workflow-snapshot [--base <ref>]`);
    }
  }
  return { baseRef };
}

/**
 * 构建确定性快照 JSON；只依赖 Git 基线、排序后的记录和工作树 blob ID。
 * @param {string[]} argv 命令行参数
 * @returns {object} 快照结果
 */
function createSnapshot(argv) {
  const args = parseArgs(argv);
  const rootOutput = runGit(["rev-parse", "--show-toplevel"], { cwd: process.cwd() });
  const root = path.resolve(rootOutput.toString("utf8").trim());
  const baseSha = resolveBase(root, args.baseRef);
  const diffOutput = runGit(["diff", "--name-status", "--find-renames", "--no-ext-diff", "-z", baseSha, "--"], { cwd: root });
  const statusOutput = runGit(["status", "--porcelain=v1", "-z", "--untracked-files=all"], { cwd: root });
  const records = mergeRecords(parseDiffRecords(diffOutput), parseStatusRecords(statusOutput));
  const changed = [];

  for (const record of records) {
    const item = {
      status: record.status,
      path: record.path,
      blobId: readBlobId(root, record.path),
    };
    if (record.previousPath) {
      item.previousPath = record.previousPath;
    }
    changed.push(item);
  }

  const canonical = JSON.stringify({ baseSha, changed });
  const digest = crypto.createHash("sha256").update(canonical, "utf8").digest("hex");
  return {
    baseRef: args.baseRef,
    baseSha,
    snapshotId: `sha256:${digest}`,
    changed,
  };
}

/**
 * CLI 入口：成功时只输出紧凑 JSON，失败时输出可操作错误并返回非零状态。
 * @returns {void}
 */
function main() {
  try {
    process.stdout.write(`${JSON.stringify(createSnapshot(process.argv.slice(2)))}\n`);
  } catch (error) {
    process.stderr.write(`workflow-snapshot: ${error.message}\n`);
    process.exitCode = 1;
  }
}

main();
