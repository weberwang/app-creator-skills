import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildNativeTargets,
  collectNativeHeadingAnchors,
  extractMarkdownSection,
  extractNativeSection,
  markdownProse,
  normalizeNativeHeadingFragment,
  resolveNativeFragment,
} from '../skills/app-skill-runtime/native-contracts.mjs';

/** 原生贡献标记只定位其来源区块，不接受缺失或重复边界。 */
test('extractNativeSection requires one ordered source boundary pair', () => {
  const manual = '<!-- native-source:demo:start -->\ncontent\n<!-- native-source:demo:end -->';
  assert.equal(extractNativeSection(manual, 'demo'), 'content');
  assert.throws(() => extractNativeSection(manual, 'missing'), /缺少或重复来源章节/);
  assert.throws(() => extractNativeSection(manual + '\n<!-- native-source:demo:start -->', 'demo'), /缺少或重复来源章节/);
  assert.throws(() => extractNativeSection('<!-- native-source:demo:end --><!-- native-source:demo:start -->', 'demo'), /缺少或重复来源章节/);
});

/** 标题解析跳过围栏与缩进示例，并为重复标题保留稳定编号。 */
test('heading anchors ignore code examples and number repeated source headings', () => {
  const tick = String.fromCharCode(96);
  assert.equal(normalizeNativeHeadingFragment(tick + 'Warm Up' + tick + '!'), 'warm-up');
  const markdown = [
    '# Real Section',
    '    ## Indented Example',
    '~~~js',
    '## Tilde Example',
    '~~~',
    tick.repeat(4) + 'text',
    '### Backtick Example',
    tick.repeat(4),
    '## Repeat',
    '## Repeat',
    '### ' + tick + 'Quoted' + tick + ' Name',
  ].join('\n');
  assert.deepEqual([...collectNativeHeadingAnchors(markdown, 'demo')], [
    ['real-section', 'mode-demo--real-section'],
    ['repeat', 'mode-demo--repeat'],
    ['repeat-1', 'mode-demo--repeat-1'],
    ['quoted-name', 'mode-demo--quoted-name'],
  ]);
});

/** 正文扫描复用 fence 状态机，不把围栏内的 fence 示例当作真实依赖。 */
test('markdown prose excludes nested fence examples and retains only real links', () => {
  const markdown = [
    '~~~text',
    '~~~html',
    '[Fake](fake.md)',
    '~~~',
    '[Real](real.md)',
  ].join('\n');
  const prose = markdownProse(markdown);
  assert.deepEqual(prose.match(/\[[^\]]+\]\([^)]+\)/g), ['[Real](real.md)']);
});

/** 一处映射同时提供模式锚点与来源段落移入公共正文后的重定向。 */
test('native targets share manual sections and public heading redirects', () => {
  const targets = buildNativeTargets([{
    sourceSkill: 'cocos-game-audio',
    manualPath: 'skills/app-stack-cocos/references/native-contracts.md',
    section: 'mode-cocos-game-audio',
    body: '## Retained Heading\n',
  }], [{
    implementation: 'skills/app-domain-toolkit/references/audio.md',
    sources: [{
      sourcePath: 'skills/cocos-game-audio/SKILL.md',
      sections: [
        { sourceHeading: 'Moved Heading', heading: 'Other Text' },
        { sourceHeading: 'Moved Heading', heading: 'Moved Heading' },
      ],
    }],
  }]);
  const target = targets.get('cocos-game-audio');
  assert.equal(target.stagePath, 'skills/cocos-game-audio/ADAPTER.md');
  assert.deepEqual(resolveNativeFragment(target, 'mode-cocos-game-audio'), { kind: 'native', anchor: 'mode-cocos-game-audio' });
  assert.deepEqual(resolveNativeFragment(target, 'Retained Heading'), { kind: 'native', anchor: 'mode-cocos-game-audio--retained-heading' });
  assert.deepEqual(resolveNativeFragment(target, 'Moved Heading'), {
    kind: 'shared',
    path: 'skills/app-domain-toolkit/references/audio.md',
    anchor: 'moved-heading',
  });
  assert.throws(() => resolveNativeFragment(target, 'invented-heading', 'fixture.md'), /没有已知章节或公共重定向/);
  assert.throws(() => buildNativeTargets([
    { sourceSkill: 'same', manualPath: 'manual.md', section: 'mode-same', body: '' },
    { sourceSkill: 'same', manualPath: 'manual.md', section: 'mode-same', body: '' },
  ]), /无效或重复/);
});

/** 公共正文读取支持显式锚点和标题 slug，且只返回该标题的从属内容。 */
test('markdown section extraction uses explicit ids or GitHub heading slugs', () => {
  const markdown = [
    '# Root',
    'Root content',
    '<a id="release-candidate-evidence"></a>',
    '## Release Candidate Evidence',
    'Release body',
    '### Evidence matrix',
    'Matrix body',
    '## Another Heading',
    'Sibling content',
  ].join('\n');
  const byId = extractMarkdownSection(markdown, 'release-candidate-evidence');
  assert.ok(byId.startsWith('<a id="release-candidate-evidence"></a>'));
  assert.ok(byId.includes('### Evidence matrix\nMatrix body'));
  assert.doesNotMatch(byId, /Another Heading/);
  const bySlug = extractMarkdownSection(markdown, 'another-heading');
  assert.match(bySlug, /^## Another Heading/);
  assert.match(bySlug, /Sibling content/);
  assert.equal(extractMarkdownSection(markdown, ''), markdown);
  assert.throws(() => extractMarkdownSection(markdown, 'missing-heading'), /锚点不存在/);
});

/** 示例中的伪锚点和伪标题不能劫持真实公共片段解析。 */
test('markdown section extraction ignores fake headings in fences and indentation', () => {
  const fence = String.fromCharCode(96).repeat(3);
  const markdown = [
    '# Root',
    fence + 'md',
    '<a id="target"></a>',
    '## Target',
    fence,
    '    ## Target',
    '<a id="target"></a>',
    '## Target',
    'Expected content',
    '## Next',
    'Other content',
  ].join('\n');
  const section = extractMarkdownSection(markdown, 'target');
  assert.ok(section.startsWith('<a id="target"></a>\n## Target'));
  assert.match(section, /Expected content/);
  assert.doesNotMatch(section, /fake|Other content/);
});

/** 跨行 HTML 注释内的伪标题与锚点不参与公共片段解析。 */
test('multiline HTML comments do not contribute headings or explicit anchors', () => {
  const markdown = [
    '# Root',
    '<!--',
    '## Fake Heading',
    '<a id="hidden-target"></a>',
    '-->',
    '## Real Heading',
    'Real content',
  ].join('\n');
  assert.deepEqual([...collectNativeHeadingAnchors(markdown, 'demo')], [
    ['root', 'mode-demo--root'],
    ['real-heading', 'mode-demo--real-heading'],
  ]);
  assert.throws(() => extractMarkdownSection(markdown, 'hidden-target'), /锚点不存在/);
  assert.match(extractMarkdownSection(markdown, 'real-heading'), /Real content/);
});

/** 下一节的独立锚点归属下一节，标题行锚点和间隔空行仍可正常读取。 */
test('section boundaries exclude the next standalone anchor and keep inline anchors', () => {
  const markdown = [
    '## First',
    'First body',
    '',
    '<a id="next-section"></a>',
    '',
    '## <a id="inline-section"></a> Second',
    'Second body',
    '',
    '### Child',
    'Child body',
    '',
    '## Third',
    'Third body',
  ].join('\n');
  const first = extractMarkdownSection(markdown, 'first');
  assert.match(first, /First body/);
  assert.doesNotMatch(first, /next-section|Second body/);
  const second = extractMarkdownSection(markdown, 'next-section');
  assert.ok(second.startsWith('<a id="next-section"></a>'));
  assert.match(second, /### Child\nChild body/);
  assert.doesNotMatch(second, /Third body/);
  assert.ok(extractMarkdownSection(markdown, 'inline-section').startsWith('## <a id="inline-section"></a> Second'));
});

/** 重复锚点或同名实际标题会显式报错，避免静默截取错误的公共规则。 */
test('markdown section extraction rejects duplicate identifiers and ambiguous slugs', () => {
  assert.throws(() => extractMarkdownSection([
    '<a id="target"></a>',
    '## First',
    '<a id="target"></a>',
    '## Second',
  ].join('\n'), 'target'), /锚点重复/);
  assert.throws(() => extractMarkdownSection([
    '## Repeated',
    '## Repeated',
    '## Repeated-1',
  ].join('\n'), 'repeated-1'), /片段重复/);
});
