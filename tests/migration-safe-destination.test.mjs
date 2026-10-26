import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import test from 'node:test';
import { assertSafeDestination } from '../scripts/migration/migrate-specialists.mjs';

const REPOSITORY_ROOT = resolve(import.meta.dirname, '..');
const STACKS = ['unity', 'cocos', 'phaser', 'threejs', 'flutter'];

/** 精确验证五个手册目标可写，同时栈入口、profile 与公共资源仍受保护。 */
test('迁移安全解析器只放行五份原生手册', () => {
  for (const stack of STACKS) {
    const destination = `skills/app-stack-${stack}/references/native-contracts.md`;
    assert.equal(assertSafeDestination(destination), resolve(REPOSITORY_ROOT, ...destination.split('/')));
    assert.throws(() => assertSafeDestination(`skills/app-stack-${stack}/SKILL.md`), /不得覆盖公共技能或运行时/);
    assert.throws(() => assertSafeDestination(`skills/app-stack-${stack}/profile.json`), /不得覆盖公共技能或运行时/);
    assert.throws(() => assertSafeDestination(`skills/app-stack-${stack}/references/other.md`), /不得覆盖公共技能或运行时/);
  }

  assert.throws(() => assertSafeDestination('skills/app-creator-workflow/references/native-contracts.md'), /不得覆盖公共技能或运行时/);
  assert.throws(() => assertSafeDestination('skills/app-skill-runtime/native-contracts.md'), /不得覆盖公共技能或运行时/);
});
