/** 测试 Dirichlet Android 状态机，并在本机具备官方 AAR 时编译真实供应商接口。 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, delimiter, dirname, join, resolve } from 'node:path';
import test from 'node:test';

const root = resolve('skills/app-domain-toolkit/assets/mobile-sdks/dirichlet/native/android');
const fixture = resolve('tests/fixtures/dirichlet-android');
const sdkJar = process.env.DIRICHLET_ANDROID_CLASSES_JAR ?? join(tmpdir(), 'codex-taptap-android-source', 'classes.jar');
const androidJar = process.env.DIRICHLET_ANDROID_JAR ?? 'D:/Android/platforms/android-35/android.jar';
/** 可用官方 Cocos Creator 源码时额外验证 JSB 真实接口。 */
const cocosSources = process.env.DIRICHLET_COCOS_JAVA_DIR ?? join(tmpdir(), 'codex-cocos-real/com/cocos/lib');

/** 测试只清理创建于系统临时目录且前缀独占的编译目录。 */
function temporary(t) {
  const directory = mkdtempSync(join(tmpdir(), 'dirichlet-android-test-'));
  t.after(() => {
    assert.equal(dirname(realpathSync(directory)), realpathSync(tmpdir()));
    assert.ok(basename(directory).startsWith('dirichlet-android-test-'));
    rmSync(directory, { recursive: true, force: true });
  });
  return directory;
}

/** 收集确定目录内的 Java 文件，用于真实 API 编译。 */
function javaFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? javaFiles(path) : entry.name.endsWith('.java') ? [path] : [];
  });
}

/** 命令失败时保留编译错误，便于定位真实签名变更。 */
function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8', timeout: 120000 });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}\n${result.error ?? ''}`);
  return result.stdout;
}

test('Android 聚合状态正确处理授权、异步加载、迟到奖励与容量限制', (t) => {
  const directory = temporary(t);
  run('javac', ['-encoding', 'UTF-8', '-d', directory,
    join(root, 'core/org/appcreator/dirichlet/DirichletAds.java'),
    join(fixture, 'org/appcreator/dirichlet/DirichletAndroidFixture.java')]);
  assert.match(run('java', ['-cp', directory, 'org.appcreator.dirichlet.DirichletAndroidFixture']), /PASS/);
});

test('Android 核心和宿主薄桥按官方 AAR 签名编译', { skip: !existsSync(sdkJar) || !existsSync(androidJar) ? '未提供官方 classes.jar 或 Android SDK android.jar' : false }, (t) => {
  const directory = temporary(t);
  const paths = ['core', 'cocos', 'capacitor'].flatMap((part) => javaFiles(join(root, part)));
  run('javac', ['-encoding', 'UTF-8', '-cp', [androidJar, sdkJar].join(delimiter), '-d', directory,
    ...javaFiles(join(fixture, 'stubs')), ...paths]);
});

test('Cocos 原生桥按官方 Creator 3.8 JSB 源码编译', { skip: ![sdkJar, androidJar, join(cocosSources, 'JsbBridge.java'), join(cocosSources, 'JsbBridgeWrapper.java')].every(existsSync) ? '未提供官方 SDK、Android 平台或 Cocos JSB 源码' : false }, (t) => {
  const directory = temporary(t);
  run('javac', ['-encoding', 'UTF-8', '-cp', [androidJar, sdkJar].join(delimiter), '-d', directory,
    join(cocosSources, 'JsbBridge.java'), join(cocosSources, 'JsbBridgeWrapper.java'),
    join(fixture, 'stubs/com/cocos/lib/CocosHelper.java'),
    ...javaFiles(join(root, 'core')), ...javaFiles(join(root, 'cocos'))]);
});
