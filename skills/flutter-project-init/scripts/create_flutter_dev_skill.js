#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

/** 输出脚本支持的参数和调用方式。 */
function printHelp() {
  console.log(`usage: create_flutter_dev_skill.js [-h] [--skills-dir SKILLS_DIR] target

positional arguments:
  target                Flutter project root

options:
  -h, --help            show this help message and exit
  --skills-dir SKILLS_DIR
                        Directory under target where flutter-dev should be created`);
}

/**
 * 解析与原 Python 脚本等价的命令行参数。
 * @param {string[]} argv 原始命令行参数。
 * @returns {{target: string, skillsDir: string, help: boolean}}
 */
function parseArgs(argv) {
  const options = { target: null, skillsDir: ".", help: false };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "-h" || argument === "--help") {
      options.help = true;
    } else if (argument === "--skills-dir") {
      index += 1;
      if (index >= argv.length || argv[index].startsWith("--")) {
        throw new Error("argument --skills-dir: expected one argument");
      }
      options.skillsDir = argv[index];
    } else if (argument.startsWith("--skills-dir=")) {
      options.skillsDir = argument.slice("--skills-dir=".length);
    } else if (argument.startsWith("-")) {
      throw new Error(`unrecognized arguments: ${argument}`);
    } else if (options.target === null) {
      options.target = argument;
    } else {
      throw new Error(`unrecognized arguments: ${argument}`);
    }
  }

  if (!options.help && options.target === null) {
    throw new Error("the following arguments are required: target");
  }
  return options;
}

/**
 * 尽可能解析路径中已经存在的符号链接，防止 skills-dir 借链接逃逸目标目录。
 * @param {string} inputPath 待解析路径。
 * @returns {string} 物理路径与尚未创建尾部路径组合后的绝对路径。
 */
function resolvePhysicalPath(inputPath) {
  const absolute = path.resolve(inputPath);
  const missingSegments = [];
  let cursor = absolute;

  while (!fs.existsSync(cursor)) {
    const parent = path.dirname(cursor);
    if (parent === cursor) {
      return absolute;
    }
    missingSegments.unshift(path.basename(cursor));
    cursor = parent;
  }

  return path.join(fs.realpathSync.native(cursor), ...missingSegments);
}

/**
 * 判断 child 是否位于 parent 内部（允许二者相等）。
 * @param {string} parent 父目录。
 * @param {string} child 待校验路径。
 * @returns {boolean} 是否未逃逸父目录。
 */
function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

/**
 * 复制模板文件，并保留源文件权限与时间戳以对应 shutil.copy2 行为。
 * @param {string} source 源文件路径。
 * @param {string} destination 目标文件路径。
 */
function copyFileWithMetadata(source, destination) {
  fs.copyFileSync(source, destination);
  const metadata = fs.statSync(source);
  fs.chmodSync(destination, metadata.mode);
  fs.utimesSync(destination, metadata.atime, metadata.mtime);
}

/**
 * 创建项目内 flutter-dev skill。
 * @param {{target: string, skillsDir: string}} options 已解析参数。
 */
function createFlutterDevSkill(options) {
  const skillDirectory = path.resolve(__dirname, "..");
  const template = path.join(skillDirectory, "assets", "flutter-dev");
  if (!fs.existsSync(template)) {
    throw new Error(`Missing template: ${template}`);
  }

  const targetRoot = resolvePhysicalPath(options.target);
  // path.resolve 与 pathlib 的 `/` 运算一致：绝对 skills-dir 会替换 target，再由下方门禁拒绝。
  const outputParent = resolvePhysicalPath(path.resolve(targetRoot, options.skillsDir));
  if (!isInside(targetRoot, outputParent)) {
    throw new Error("Refusing to write outside target project");
  }

  const output = path.join(outputParent, "flutter-dev");
  fs.mkdirSync(output, { recursive: true });
  copyFileWithMetadata(path.join(template, "SKILL.md"), path.join(output, "SKILL.md"));
  console.log(output);
}

/** 统一处理帮助、参数错误和运行时错误的退出码。 */
function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`create_flutter_dev_skill.js: error: ${error.message}`);
    process.exitCode = 2;
    return;
  }

  if (options.help) {
    printHelp();
    return;
  }

  try {
    createFlutterDevSkill(options);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

main();
