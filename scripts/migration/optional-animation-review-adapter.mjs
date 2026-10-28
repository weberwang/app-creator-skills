/** 对三栈原生动画证据合同实施可选播放预览，保持来源、图集和报告校验。 */
const PREFIXES = { cocos: 'cocos', phaser: 'phaser4', threejs: 'threejs' };

/** 唯一替换已经审阅的源代码边界，源结构变化时中断迁移。 */
function replaceOnce(source, before, after, label) {
  const index = source.indexOf(before);
  if (index < 0 || source.indexOf(before, index + before.length) >= 0) throw new Error(`${label} 锚点缺失或重复`);
  return source.slice(0, index) + after + source.slice(index + before.length);
}

/** 将播放预览从必需证据中移出，声明后仍严格校验文件和报告的双向身份。 */
function adaptContract(source, isImage, stack) {
  const artifactList = isImage ? 'IMAGE_FRAME_ANIMATION_WORKFLOW_ARTIFACTS' : 'FRAME_ANIMATION_WORKFLOW_ARTIFACTS';
  let text = source.replaceAll('\r\n', '\n');
  text = replaceOnce(text, '  "quality_report",\n  "preview",\n  "spritesheet",', '  "quality_report",\n  "spritesheet",', `${stack} 必需文件`);
  text = text.replace('accepted 合同必须绑定的五个文件', 'accepted 合同必须绑定的四个文件');
  const staticLoop = `  for (const artifact of ${artifactList}) {\n    validateArtifactBinding(value[artifact], label + "." + artifact, errors);\n  }`;
  text = replaceOnce(text, staticLoop, `${staticLoop}\n  // 播放预览是可选证据；一旦声明仍必须是真实且安全的文件绑定。\n  if (Object.hasOwn(value, "preview")) validateArtifactBinding(value.preview, label + ".preview", errors);`, `${stack} 预览静态校验`);
  const requirePreview = '  if (!nonEmptyString(report.artifacts?.preview?.file)) errors.push(label + ".artifacts.preview.file 必须是非空字符串");';
  text = replaceOnce(text, requirePreview,
    '  // 报告与已接受合同必须同时声明同一预览，不能用单侧声明绕过文件门。\n  const hasPreview = Object.hasOwn(contract, "preview");\n  const hasReportedPreview = isObject(report.artifacts) && Object.hasOwn(report.artifacts, "preview");\n  if (hasPreview !== hasReportedPreview) errors.push(label + ".artifacts.preview 必须与合同同时声明或同时省略");\n  if (hasPreview && !nonEmptyString(report.artifacts?.preview?.file)) errors.push(label + ".artifacts.preview.file 必须是非空字符串");', `${stack} 预览报告`);
  const reportedPath = '  validateReportedArtifactPath(report.artifacts?.preview?.file, contract.preview, label + ".artifacts.preview.file", errors);';
  text = replaceOnce(text, reportedPath, '  if (hasPreview && hasReportedPreview) validateReportedArtifactPath(report.artifacts?.preview?.file, contract.preview, label + ".artifacts.preview.file", errors);', `${stack} 预览身份`);
  if (isImage) text = replaceOnce(text, '  for (const key of ["quality_report", "preview", "spritesheet"]) {', '  for (const key of ["quality_report", "spritesheet"]) {', `${stack} 图片文件`);
  const checkPreview = stack === 'threejs'
    ? '  validatePreview(artifacts.preview, label + ".preview", errors);'
    : '  validatePreview(artifacts.preview, artifacts.spritesheet, label + ".preview", errors);';
  text = replaceOnce(text, checkPreview,
    `  // 明确要求播放预览时再读取并校验真实 HTML。\n  if (Object.hasOwn(contract, "preview")) {\n    artifacts.preview = await readBoundArtifact(contract.preview, label + ".preview", context, errors);\n  ${checkPreview.trim()}\n  }`, `${stack} 预览文件门`);
  return text;
}

const VIDEO_TEST = `
test("动画合同可省略网页，但声明预览后必须读取并绑定同批报告", async () => {
  await withFixture(async (root, fixture) => {
    const preview = fixture.asset.frame_animation.preview;
    delete fixture.asset.frame_animation.preview;
    delete fixture.report.artifacts.preview;
    await writeReport(root, fixture);
    assert.deepEqual(await runGate(root, fixture.asset), []);
    fixture.asset.frame_animation.preview = preview;
    assert((await runGate(root, fixture.asset)).some((error) => error.includes("同时声明")));
    fixture.report.artifacts.preview = { file: preview.file };
    await writeReport(root, fixture);
    assert.deepEqual(await runGate(root, fixture.asset), []);
    await rm(join(root, preview.file));
    assert((await runGate(root, fixture.asset)).some((error) => error.includes("preview")));
  });
});
`;

const IMAGE_TEST = `
test("图片动画合同默认无需网页，显式预览必须与报告和真实文件一致", async () => {
  const fixture = await createFixtureRoot();
  try {
    const preview = fixture.contract.preview;
    delete fixture.contract.preview;
    delete fixture.report.artifacts.preview;
    await rewriteReport(fixture);
    assert.deepEqual(await checkImageFrameAnimationWorkflowFiles(fixture.asset, { projectRoot: fixture.root }), []);
    fixture.contract.preview = preview;
    assert((await checkImageFrameAnimationWorkflowFiles(fixture.asset, { projectRoot: fixture.root })).some((error) => error.includes("同时声明")));
    fixture.report.artifacts.preview = { file: preview.file };
    await rewriteReport(fixture);
    assert.deepEqual(await checkImageFrameAnimationWorkflowFiles(fixture.asset, { projectRoot: fixture.root }), []);
    await writeFile(join(fixture.root, preview.file), "broken html");
    assert((await checkImageFrameAnimationWorkflowFiles(fixture.asset, { projectRoot: fixture.root })).some((error) => error.includes("preview")));
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});
`;

/** 保留原生播放页和路径断言，显式请求预览；无关预览的摘要用例核对默认不产生网页。 */
function adaptImagePackerTest(source, stack) {
  let text = source.replaceAll('\r\n', '\n');
  text = replaceOnce(text, '    outputSheet,\n    width: 12,',
    '    outputSheet,\n    outputPreview: join(directory, "packed-preview.html"),\n    width: 12,', `${stack} 图片播放页测试`);
  text = replaceOnce(text, '    "--output-sheet", "cli/hero.png",',
    '    "--output-sheet", "cli/hero.png",\n    "--output-preview", "cli/hero.html",', `${stack} CLI 播放页路径测试`);
  text = replaceOnce(text, '  assert.equal((await readFile(join(directory, "tampered.html"))).length > 0, true);',
    '  assert.equal(Object.hasOwn(report.artifacts, "preview"), false);\n  await assert.rejects(readFile(join(directory, "tampered.html")), { code: "ENOENT" });', `${stack} 默认无网页测试`);
  return text;
}

/** 与主迁移链集成：只匹配三栈原生动画合同与对应测试。 */
export function adaptOptionalAnimationReview(text, { stack, sourcePath } = {}) {
  const prefix = PREFIXES[stack];
  if (!prefix || typeof sourcePath !== 'string') return { text, transforms: [] };
  const base = `skills/${prefix}-game-asset-integration/scripts/`;
  const frame = `skills/${prefix}-frame-animation/scripts/images-to-atlas.test.mjs`;
  const video = `${base}frame-animation-workflow-contract`;
  const image = `${base}image-frame-animation-workflow-contract`;
  if (sourcePath === frame) {
    return { text: adaptImagePackerTest(text, stack), transforms: ['test-optional-image-preview'] };
  }
  if (sourcePath === `${video}.mjs` || sourcePath === `${image}.mjs`) {
    return { text: adaptContract(text, sourcePath === `${image}.mjs`, stack), transforms: ['optional-animation-preview-contract'] };
  }
  if (sourcePath === `${video}.test.mjs` || sourcePath === `${image}.test.mjs`) {
    return { text: `${text.trimEnd()}\n${sourcePath === `${image}.test.mjs` ? IMAGE_TEST : VIDEO_TEST}`, transforms: ['test-optional-animation-preview'] };
  }
  return { text, transforms: [] };
}
