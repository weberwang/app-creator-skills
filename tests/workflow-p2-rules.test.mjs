/** 验证修订规则随 Flutter 独立安装进入实际策划和布局读取链。 */
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { installSkills } from '../packages/installer/install-project-skills.mjs';

test('Flutter 安装后的原生策划和布局入口保留增量范围与返修复验边界', async (t) => {
  const project = mkdtempSync(join(tmpdir(), 'workflow-p2-rules-'));
  t.after(() => {
    // 只清理由本用例在系统临时目录中创建的独占项目。
    assert.equal(dirname(resolve(project)), resolve(tmpdir()));
    assert.ok(basename(project).startsWith('workflow-p2-rules-'));
    rmSync(project, { recursive: true, force: true });
  });
  installSkills({ projectRoot: project, stacks: ['flutter'] });
  const skillsRoot = join(project, '.agents/skills');
  const { loadNativeMode } = await import(pathToFileURL(join(skillsRoot, 'app-skill-runtime/read-native-mode.mjs')).href);
  const { extractMarkdownSection } = await import(pathToFileURL(join(skillsRoot, 'app-skill-runtime/native-contracts.mjs')).href);
  /** 只读取安装副本，避免源仓库掩盖缺失的交付文件。 */
  const read = (path) => readFileSync(join(skillsRoot, path), 'utf8');

  // 读取安装副本的真实路由与直接公共依赖，防止只修改源文件而未交付消费者。
  const planning = loadNativeMode({ skillsRoot, stack: 'flutter', capability: 'app-product-planning' });
  const native = planning.documents.find((document) => document.kind === 'native').content;
  const shared = planning.documents.find((document) => document.path === 'app-creator-workflow/references/professional-conventions.md' && document.section === 'planning-scope-and-acceptance');
  assert.ok(shared, 'Flutter 策划模式缺少公共策划范围');
  assert.match(native, /既有增量只补受影响行为、状态、依赖与回归条件/);
  assert.match(native, /仅用户明确采用 MVP 范围时/);
  assert.match(native, /仅在真实任务涉及或已有项目要求时核对/);
  assert.match(native, /不选择预设或不填预设字段均不是缺陷/);
  assert.doesNotMatch(native, /Split MVP from later features|Leaving the visual expression preset blank/);
  assert.ok(planning.resources.some((resource) => resource.path === 'flutter-product-spec/references/product-brief-template.md' && resource.available));
  const brief = read('flutter-product-spec/references/product-brief-template.md');
  assert.match(brief, /未涉及商业或 MVP 时跳过对应章节/);

  const layout = loadNativeMode({ skillsRoot, stack: 'flutter', capability: 'app-ui-layout' });
  const layoutSkill = read(layout.capabilityPath);
  assert.match(layoutSkill, /有效的断点／内容矩阵、导航顺序和运行验证矩阵直接引用/);
  assert.match(layoutSkill, /仅断点、内容适配、导航或输入发生实际变化时补充对应范围/);
  const review = extractMarkdownSection(read('app-asset-workflow/references/art-review.md'), '当前设计稿的单次用户视角审查');
  assert.match(review, /对本轮失败项和修改实际影响的操作、状态、语义与结构自主复验/);
  assert.match(review, /未经明确授权不得自动分析设计稿截图或运行截图/);
  assert.doesNotMatch(review, /不对修改稿自动再次开展用户视角审查/);
});
