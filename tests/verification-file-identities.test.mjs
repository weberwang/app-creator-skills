/** 验证两个只读工具共用的文件身份、路径边界及参数解析。 */
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import test from 'node:test';
import { checkedPath, inspectFile, inspectPath, parseFlags, readCheckedJson } from '../skills/app-domain-toolkit/scripts/verification/file-identities.mjs';

/** 所有夹具只写独占临时目录，递归清理前核对真实目标。 */
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'verification-files-'));
  t.after(() => {
    const actual = realpathSync(root);
    assert.equal(dirname(actual), realpathSync(tmpdir()));
    assert.ok(basename(actual).startsWith('verification-files-'));
    rmSync(actual, { recursive: true, force: true });
  });
  return root;
}

/** 内容摘要和文件集合独立于文件修改时间，空输入文件也能真实记录。 */
test('确定顺序记录目录内文件，且读取不改写输入', (t) => {
  const root = fixture(t);
  mkdirSync(join(root, 'src/sub'), { recursive: true });
  writeFileSync(join(root, 'src/z.txt'), 'last');
  writeFileSync(join(root, 'src/sub/a.txt'), '');
  const before = readFileSync(join(root, 'src/z.txt'));
  const record = inspectPath(root, 'src');
  assert.equal(record.kind, 'directory');
  assert.deepEqual(record.files.map((file) => file.path), ['src/sub/a.txt', 'src/z.txt']);
  assert.equal(record.files[0].bytes, 0);
  assert.match(record.files[0].sha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(inspectPath(root, 'src'), record);
  assert.deepEqual(readFileSync(join(root, 'src/z.txt')), before);
});

/** 只排除根级工具路径，不能误伤业务子目录中同名文件夹。 */
test('拒绝根工具目录、Git 元数据及路径逃逸，保留业务同名目录', (t) => {
  const root = fixture(t);
  for (const path of ['.agents/data.json', '.git/config', '../outside', '/absolute', 'src/../file', 'src\\file']) {
    assert.throws(() => checkedPath(root, path));
  }
  if (process.platform === 'win32') assert.throws(() => checkedPath(root, '.AGENTS/data.json'));
  mkdirSync(join(root, 'src/.agents'), { recursive: true });
  writeFileSync(join(root, 'src/.agents/data.json'), '{}');
  assert.equal(readCheckedJson(root, 'src/.agents/data.json').constructor, Object);
});

/** 项目内外链接都无法代表显式路径下的独立输入文件。 */
test('不跟随目录或文件链接，即使链接仍指向项目内', (t) => {
  const root = fixture(t);
  mkdirSync(join(root, 'actual'));
  writeFileSync(join(root, 'actual/file.txt'), 'content');
  symlinkSync(join(root, 'actual'), join(root, 'alias'), process.platform === 'win32' ? 'junction' : 'dir');
  // 现有路径保护也可能先以“父级不是普通目录”拒绝链接祖先。
  assert.throws(() => inspectFile(root, 'alias/file.txt'));
  assert.throws(() => inspectPath(root, 'alias'), /链接|Junction/);
});

/** 空目录和 JSON 解析反映实际内容，不能当作自动通过的占位数据。 */
test('空目录、非文件和无效 JSON 分别处理', (t) => {
  const root = fixture(t);
  mkdirSync(join(root, 'empty'));
  assert.deepEqual(inspectPath(root, 'empty'), { path: 'empty', kind: 'directory', files: [] });
  assert.throws(() => inspectFile(root, 'empty'), /普通文件/);
  writeFileSync(join(root, 'invalid.json'), '{');
  assert.throws(() => readCheckedJson(root, 'invalid.json'), /有效 JSON/);
});

/** 未知、重复或缺值参数必须在读取项目之前失败。 */
test('只允许明确值参数及声明可重复项', () => {
  const options = { single: ['repo'], repeat: ['input'] };
  assert.deepEqual(parseFlags(['--repo', 'project', '--input', 'a', '--input', 'b'], options), { repo: 'project', input: ['a', 'b'] });
  for (const args of [['--repo'], ['--repo', '--input'], ['--unknown', 'x'], ['--repo', 'a', '--repo', 'b'], ['positional'], ['--repo', ' ']]) {
    assert.throws(() => parseFlags(args, options));
  }
});
