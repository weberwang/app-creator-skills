import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { encodePngRgba } from '../skills/app-asset-workflow/scripts/png-raster.mjs';

const threadId = '12345678-1234-4234-8234-123456789012';

/** 用离线替身模拟 Codex 会话，保留原脚本的产物交付逻辑。 */
async function setup() {
  const root = await mkdtemp(join(tmpdir(), 'imagegen-request-test-'));
  const source = await readFile(new URL('../skills/app-asset-workflow/scripts/invoke-codex-imagegen.ps1', import.meta.url), 'utf8');
  const start = source.indexOf('# 每次只管理自己启动的进程');
  const end = source.indexOf('# 只从当前会话的 Codex 缓存回收', start);
  assert.ok(start >= 0 && end > start);
  const fake = `# 离线替身只模拟当前测试会话，不发起生成。
function Invoke-ImagegenCodex {
    param([string[]]$Arguments, [string]$WorkingDirectory, [string]$TempDirectory, [string]$InputText, [int]$Seconds = 30)
    if ($Arguments -contains 'login') { return [pscustomobject]@{ ExitCode = 0; Stdout = 'Logged in using ChatGPT'; Stderr = '' } }
    if ($Arguments -contains '--version') { return [pscustomobject]@{ ExitCode = 0; Stdout = 'codex-cli fixture'; Stderr = '' } }
    if ($env:IMAGEGEN_TEST_COLLISION -eq '1') { [IO.File]::WriteAllText($env:IMAGEGEN_TEST_DESTINATION, '竞争文件') }
    return [pscustomobject]@{ ExitCode = 0; Stdout = '{"type":"thread.started","thread_id":"${threadId}"}'; Stderr = '' }
}

`;
  const script = source.slice(0, start) + fake + source.slice(end);
  const isolatedScript = script.replace("$userProfile = [Environment]::GetFolderPath('UserProfile')", "$userProfile = $env:IMAGEGEN_TEST_PROFILE");
  assert.notEqual(script, isolatedScript);
  const scriptPath = join(root, 'invoke.ps1');
  const promptPath = join(root, 'prompt.txt');
  const referencePath = join(root, 'reference.png');
  const destination = join(root, 'output', 'image.png');
  const original = join(root, '.codex', 'generated_images', threadId, 'original.png');
  const png = encodePngRgba(1, 1, Buffer.from([32, 64, 96, 255]));
  await mkdir(dirname(original), { recursive: true });
  await writeFile(scriptPath, isolatedScript);
  await writeFile(promptPath, '实际提交的提示词 '.repeat(100));
  await writeFile(referencePath, png);
  await writeFile(original, png);
  return { root, scriptPath, promptPath, referencePath, destination, original, png };
}

/** 在隔离目录运行脚本，测试不会调用真实生图进程。 */
function run(fixture, collision = false) {
  return spawnSync('pwsh.exe', ['-NoProfile', '-File', fixture.scriptPath, '-CodexPath', process.execPath,
    '-PromptFile', fixture.promptPath, '-OutputPath', fixture.destination, '-ReferencePath', fixture.referencePath], {
    encoding: 'utf8', env: { ...process.env, IMAGEGEN_TEST_PROFILE: fixture.root,
      IMAGEGEN_TEST_DESTINATION: fixture.destination, IMAGEGEN_TEST_COLLISION: collision ? '1' : '0' },
  });
}

/** 计算记录和图片的实际摘要。 */
function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

test('成功交付紧凑输出与可追溯的请求记录', { skip: process.platform !== 'win32' }, async () => {
  const fixture = await setup();
  try {
    const processResult = run(fixture);
    assert.equal(processResult.status, 0, processResult.stderr);
    const result = JSON.parse(processResult.stdout);
    assert.equal(result.submittedPrompt, undefined);
    assert.equal(result.submittedReferenceInputs, undefined);
    assert.ok(processResult.stdout.length < 1200);
    const recordBytes = await readFile(result.requestRecordPath);
    const record = JSON.parse(recordBytes);
    assert.equal(result.requestRecordSha256, sha256(recordBytes));
    assert.equal(result.sha256, sha256(await readFile(fixture.destination)));
    assert.equal(record.sha256, result.sha256);
    assert.equal(record.threadId, threadId);
    assert.ok(record.submittedPrompt.includes(await readFile(fixture.promptPath, 'utf8')));
    assert.equal(record.submittedReferenceInputs[0].path, fixture.referencePath);
    assert.equal(record.submittedReferenceInputs[0].sha256, sha256(fixture.png));
    await assert.rejects(readFile(fixture.original), { code: 'ENOENT' });
    const second = run(fixture);
    assert.notEqual(second.status, 0);
    assert.match(second.stderr, /交付文件已存在/);
    assert.deepEqual(await readFile(result.requestRecordPath), recordBytes);
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});

test('原图提交冲突时保留请求记录和会话缓存', { skip: process.platform !== 'win32' }, async () => {
  const fixture = await setup();
  try {
    const processResult = run(fixture, true);
    assert.notEqual(processResult.status, 0);
    assert.match(processResult.stderr, /请求记录已保存，但原图交付失败/);
    assert.equal(await readFile(fixture.destination, 'utf8'), '竞争文件');
    const record = JSON.parse(await readFile(`${fixture.destination}.request.json`, 'utf8'));
    assert.equal(record.threadId, threadId);
    assert.equal(record.sha256, sha256(await readFile(fixture.original)));
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});
