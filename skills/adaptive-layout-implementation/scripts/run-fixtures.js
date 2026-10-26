#!/usr/bin/env node
"use strict";

/** 运行布局规格夹具，验证正例、负例和实现信号提示。 */

const fs = require("node:fs");
const path = require("node:path");
const YAML = require("../../app-skill-runtime/dependencies.cjs")("yaml");
const { validate } = require("./validate-layout-spec.js");

/** 读取夹具或规格 YAML。 */
function load(filePath) {
  const value = YAML.parse(fs.readFileSync(filePath, "utf8"));
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${filePath} must be a mapping`);
  }
  return value;
}

/** 解析点号路径，返回父映射和末级键。 */
function resolve(root, mutationPath) {
  const parts = mutationPath.split(".");
  let parent = root;
  for (const part of parts.slice(0, -1)) {
    parent = Array.isArray(parent) ? parent[Number.parseInt(part, 10)] : parent[part];
  }
  if (parent === null || typeof parent !== "object" || Array.isArray(parent)) {
    throw new TypeError(`mutation parent is not a mapping: ${mutationPath}`);
  }
  return [parent, parts.at(-1)];
}

/** 执行有限的 remove/set/append/duplicate 操作，保持夹具声明可审阅。 */
function mutate(spec, mutation) {
  const [parent, key] = resolve(spec, mutation.path);
  const operation = mutation.op;
  if (operation === "remove") {
    delete parent[key];
  } else if (operation === "set") {
    parent[key] = mutation.value;
  } else if (operation === "append") {
    const target = parent[key];
    if (!Array.isArray(target)) {
      throw new TypeError(`append target is not a list: ${mutation.path}`);
    }
    target.push(mutation.value);
  } else if (operation === "duplicate") {
    const target = parent[key];
    if (!Array.isArray(target)) {
      throw new TypeError(`duplicate target is not a list: ${mutation.path}`);
    }
    // 深拷贝避免重复夹具与源对象共享嵌套引用，保持原夹具变更行为。
    target.push(structuredClone(target[mutation.source_index ?? 0]));
  } else {
    throw new TypeError(`unknown mutation operation: ${operation}`);
  }
}

/** 运行单个夹具并比较预期退出状态及提示信号。 */
function runFixture(filePath) {
  const descriptor = load(filePath);
  const sourcePath = path.resolve(path.dirname(filePath), descriptor.source);
  const spec = load(sourcePath);
  for (const mutation of descriptor.mutations ?? []) {
    mutate(spec, mutation);
  }
  const [errors, attention] = validate(spec);
  const passed = errors.length === 0;
  const expected = descriptor.expected === "pass";
  const actualAttention = [...attention].sort();
  const expectedAttention = [...(descriptor.expected_attention ?? [])].sort();
  const attentionOk = actualAttention.length === expectedAttention.length
    && actualAttention.every((value, index) => value === expectedAttention[index]);
  const result = passed === expected && attentionOk;
  const label = result ? "PASS" : "FAIL";
  const detail = passed ? "valid" : errors.join("; ");
  console.log(`[${label}] ${path.basename(filePath)}: ${detail}`);
  if (attention.size > 0) {
    console.log(`  implementation_attention=${actualAttention.join(",")}`);
  }
  return result;
}

/** 运行 fixtures 目录下全部 YAML 夹具。 */
function main() {
  const fixtureDir = path.join(__dirname, "fixtures");
  const paths = fs.readdirSync(fixtureDir)
    .filter((name) => name.endsWith(".yaml"))
    .sort()
    .map((name) => path.join(fixtureDir, name));
  if (paths.length === 0) {
    console.log("[FAIL] no fixtures found");
    return 1;
  }
  // 原夹具执行器会在首个失败处短路，这里保持相同的执行和输出顺序。
  for (const fixturePath of paths) {
    if (!runFixture(fixturePath)) {
      return 1;
    }
  }
  return 0;
}

if (require.main === module) {
  process.exitCode = main();
}
