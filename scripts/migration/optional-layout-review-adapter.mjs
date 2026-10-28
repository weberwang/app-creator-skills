/** 将三栈布局审阅页改为显式交互选项，同时保留 PNG 的完整业务文件门。 */

const PREFIX = Object.freeze({ cocos: 'cocos', phaser: 'phaser4', threejs: 'threejs' });

/** 仅修改已核对的唯一源码边界，上游变化时拒绝静默丢失校验。 */
function replaceOnce(text, before, after, label) {
  const index = text.indexOf(before);
  if (index < 0 || text.indexOf(before, index + before.length) >= 0) throw new Error(`${label} 的迁移边界缺失或重复`);
  return text.slice(0, index) + after + text.slice(index + before.length);
}

/** 仅处理给定标签的首个完整校验行，不影响后续必要的身份比较。 */
function omitFirstReview(text, linePrefix, label) {
  const at = text.indexOf(linePrefix);
  if (at < 0) throw new Error(`${label} 缺少校验行`);
  const end = text.indexOf('\n', at);
  const line = text.slice(at, end < 0 ? text.length : end);
  const updated = replaceOnce(line, '"layout_review_file", ', '', label);
  return text.slice(0, at) + updated + text.slice(at + line.length);
}

/** 默认仅生成布局 PNG 和结构化事实，显式选择交互审阅时才渲染 HTML。 */
function adaptGenerator(source) {
  let text = replaceOnce(source, 'else if (token === "--project-root")', 'else if (token === "--interactive-review") args.interactiveReview = true; else if (token === "--project-root")', '布局交互选项');
  text = replaceOnce(text, 'deriveLayoutReviewArtifactPaths(projectRoot, outputPath)', 'deriveLayoutReviewArtifactPaths(projectRoot, outputPath, args.interactiveReview === true)', '布局输出路径生成');
  text = replaceOnce(text, 'args.layoutDecisionFile], args.layoutDecisionFile);', 'args.layoutDecisionFile], args.layoutDecisionFile, args.interactiveReview === true);', '布局输出路径范围');
  text = replaceOnce(text,
    '    const bindings = buildLayoutReviewBindings({ ...artifactPaths, annotationFile: artifactPaths.annotationFile, nodesFile: artifactPaths.nodesFile, decisionFile: artifactPaths.decisionFile }, { ...commonContext, nodesSha256 });\n    const reviewBytes = renderLayoutReviewBundle({ nodesDocument, bindings, originalBytes, annotationBytes, nodesBytes, decisionBytes: decisionInput.bytes });\n    const reviewSha256 = bundleSha256(reviewBytes);\n    const reviewIdentitySha256 = computeLayoutReviewIdentitySha256(bindings);',
    '    // 默认 PNG 审阅不构造网页及其身份；只有需要交互对照时才生成。\n    let reviewBytes;\n    let reviewFields = {};\n    if (args.interactiveReview) {\n      const bindings = buildLayoutReviewBindings({ ...artifactPaths, annotationFile: artifactPaths.annotationFile, nodesFile: artifactPaths.nodesFile, decisionFile: artifactPaths.decisionFile }, { ...commonContext, nodesSha256 });\n      reviewBytes = renderLayoutReviewBundle({ nodesDocument, bindings, originalBytes, annotationBytes, nodesBytes, decisionBytes: decisionInput.bytes });\n      reviewFields = { layout_review_file: artifactPaths.reviewFile, layout_review_sha256: bundleSha256(reviewBytes), layout_review_identity_sha256: computeLayoutReviewIdentitySha256(bindings) };\n    }', '布局审阅生成');
  text = replaceOnce(text, 'layout_review_file: artifactPaths.reviewFile, layout_review_sha256: reviewSha256, layout_review_identity_sha256: reviewIdentitySha256,', '...reviewFields,', '布局审阅结果');
  text = replaceOnce(text, 'writeFile(artifactPaths.review, reviewBytes)', '...(args.interactiveReview ? [writeFile(artifactPaths.review, reviewBytes)] : [])', '布局审阅文件');
  return text;
}

/** 路径冲突检查仅覆盖实际写出的文件；独立 API 默认仍检查完整网页工件。 */
function adaptBundle(source) {
  let text = replaceOnce(source, 'export function deriveLayoutReviewArtifactPaths(projectRoot, annotationPath) {', 'export function deriveLayoutReviewArtifactPaths(projectRoot, annotationPath, includeReview = true) {', '布局路径生成参数');
  text = replaceOnce(text, '    review: join(directory, "review.html"),', '    ...(includeReview ? { review: join(directory, "review.html") } : {}),', '布局网页输出路径');
  text = replaceOnce(text, '    reviewFile: projectRelativePath(projectRoot, join(directory, "review.html")),', '    ...(includeReview ? { reviewFile: projectRelativePath(projectRoot, join(directory, "review.html")) } : {}),', '布局网页相对路径');
  text = replaceOnce(text, 'export function validateLayoutReviewArtifactPaths(projectRoot, paths, protectedFiles = [], decisionInputFile = null) {', 'export function validateLayoutReviewArtifactPaths(projectRoot, paths, protectedFiles = [], decisionInputFile = null, includeReview = true) {', '布局路径检查参数');
  text = replaceOnce(text, 'const outputPaths = [paths.annotation, paths.nodes, paths.decision, paths.review, paths.generationResult];', 'const outputPaths = [paths.annotation, paths.nodes, paths.decision, ...(includeReview ? [paths.review] : []), paths.generationResult];', '布局路径实际输出');
  return text;
}

const CHECK_FILES = `/** 校验 PNG、真实 proposal、决策和节点文档；HTML 不是重算布局的前提。 */
function validateLayoutCandidateFiles(record, context, files, image, errors, label) {
  const { review, nodes, layoutDecision } = files;
  if (!nodes || !image || !layoutDecision) return;
  const expected = { projectRoot: context.projectRoot, sceneId: record.scene_id, stateId: record.state_id, decompositionConfirmationId: record.decomposition_confirmation_id, layoutDecisionId: record.layout_decision_id, referenceFile: context.referenceFile ?? context.reference_file, proposalFile: context.proposalFile ?? context.proposal_file };
  // 来源必须由上游人工拆解确认提供，不能由可选网页自行指定。
  const proposal = readBoundFile(context.projectRoot, expected.proposalFile, label + ".proposal", errors, true);
  readBoundFile(context.projectRoot, expected.referenceFile, label + ".reference", errors);
  let nodesDocument;
  try { nodesDocument = JSON.parse(nodes.bytes.toString("utf8")); }
  catch (error) { errors.push(label + ".layout_nodes 不是合法 JSON：" + error.message); return; }
  let expectedFacts = null;
  if (proposal?.json && layoutDecision?.json) {
    expectedFacts = validateLayoutNodesAgainstProposal(proposal.json, nodesDocument, layoutDecision.json, record, errors, label);
  } else {
    errors.push(label + " 缺少可用 proposal 或 layout decision，无法复算最终布局几何");
  }
  const nodeErrors = [];
  validateLayoutNodesDocument(nodesDocument, { ...expected, layoutNodes: expectedFacts?.filter((node) => node.is_root_container !== true), rootNodes: expectedFacts?.filter((node) => node.is_root_container === true) }, nodeErrors, label + ".layout_nodes");
  errors.push(...nodeErrors);
  // 不依赖调用方提供节点，直接核对 PNG 内的实际事实与同批文档。
  try {
    const annotationMetadata = decodePngRgba(image.bytes).metadata;
    const documentFacts = [...nodesDocument.layout_nodes, ...nodesDocument.root_nodes];
    if (!Array.isArray(annotationMetadata?.nodes) || canonicalJson(annotationMetadata.nodes) !== canonicalJson(documentFacts)) errors.push(label + " layout-nodes.json 与标准 PNG 的实际布局 facts 不一致");
  } catch (error) { errors.push(label + " 无法读取标准 PNG 布局 facts：" + error.message); }
  if (review) {
    const payload = readAndValidateLayoutReviewPayload(review.bytes, nodes.bytes, expected, errors, label);
    if (!payload) return;
    const bindings = payload.bindings;
    for (const [field, actual] of [["layout_annotation_file", bindings.annotation?.file], ["layout_nodes_file", bindings.nodes?.file], ["layout_decision_file", bindings.decision?.file]]) {
      if (actual !== record[field]) errors.push(label + "." + field + " 未绑定确认记录");
    }
  }
}`;

/** Phaser 的根边界和执行计划由专用求解器推导，不能使用其他栈的简化模型。 */
function phaserCheckFiles() {
  let text = replaceOnce(CHECK_FILES,
    '  let expectedFacts = null;\n  if (proposal?.json && layoutDecision?.json) {\n    expectedFacts = validateLayoutNodesAgainstProposal(proposal.json, nodesDocument, layoutDecision.json, record, errors, label);\n  } else {\n    errors.push(label + " 缺少可用 proposal 或 layout decision，无法复算最终布局几何");\n  }',
    '  if (!proposal?.json) return null;\n  const expectedLayout = deriveProposalLayout(proposal.json, layoutDecision, nodesDocument, context, errors, label);\n  if (!expectedLayout) return null;\n  validateLayoutNodesAgainstProposal(proposal.json, nodesDocument, expectedLayout.layoutNodes, errors, label);\n  const expectedFacts = expectedLayout.facts;', 'Phaser 布局派生');
  text = replaceOnce(text, '  }\n}', '  }\n  return expectedLayout;\n}', 'Phaser 布局派生返回');
  return text;
}

/** Three.js 必须先依据真实提案和决策派生节点，再按原生语义校验，不能套用 Cocos 参数。 */
function threejsCheckFiles() {
  return replaceOnce(CHECK_FILES,
    '  let expectedFacts = null;\n  if (proposal?.json && layoutDecision?.json) {\n    expectedFacts = validateLayoutNodesAgainstProposal(proposal.json, nodesDocument, layoutDecision.json, record, errors, label);\n  } else {\n    errors.push(label + " 缺少可用 proposal 或 layout decision，无法复算最终布局几何");\n  }',
    '  let expectedFacts = null;\n  if (proposal?.json && layoutDecision?.json) {\n    const rebuilt = expectedLayout(proposal.json, layoutDecision.json, record, nodesDocument, errors, label);\n    if (rebuilt) {\n      validateLayoutNodesAgainstProposal(proposal.json, nodesDocument, rebuilt.layoutNodes, context, errors, label);\n      expectedFacts = rebuilt.facts;\n    }\n  } else {\n    errors.push(label + " 缺少可用 proposal 或 layout decision，无法复算最终布局几何");\n  }', 'Three.js 布局派生');
}

/** 将与网页无关的重算移出网页分支，网页存在时仍校验内容与绑定。 */
function adaptConfirmation(source, stack) {
  let text = omitFirstReview(source, '  "layout_annotation_schema", "layout_annotation_layout",', '确认必填字段');
  text = replaceOnce(text, '"layout_annotation_file", "layout_review_file", "layout_nodes_file",', '"layout_annotation_file", "layout_nodes_file",', '决定必填字段');
  text = omitFirstReview(text, '  for (const field of ["confirmation_id", "confirmation_mode",', '确认非空字段');
  text = replaceOnce(text, '  if (record.confirmation_schema !== LAYOUT_ANNOTATION_CONFIRMATION_SCHEMA)', '  // 只允许完整省略网页，部分声明或空路径均视为错误。\n  const hasReview = Object.hasOwn(record, "layout_review_file");\n  if (hasReview && (!nonEmptyString(record.layout_review_file) || !/\\.html?$/i.test(record.layout_review_file))) errors.push(`${label}.layout_review_file 必须是有效 HTML 路径`);\n  if (!hasReview && ["layout_review_sha256", "layout_review_identity_sha256"].some((field) => Object.hasOwn(record, field))) errors.push(`${label} 网页身份字段必须绑定审阅页文件`);\n  if (record.confirmation_schema !== LAYOUT_ANNOTATION_CONFIRMATION_SCHEMA)', '可选审阅身份');
  text = replaceOnce(text, '  if (!receipt && document.confirmation_id !== record.confirmation_id)', '  // 决定与回执必须同时省略网页或绑定同一网页，不能只在一端声明。\n  if (Object.hasOwn(document, "layout_review_file") !== Object.hasOwn(record, "layout_review_file") || document.layout_review_file !== record.layout_review_file) errors.push(`${label}.layout_review_file 未绑定布局确认记录`);\n  if (["layout_review_sha256", "layout_review_identity_sha256"].some((field) => Object.hasOwn(document, field)) && !Object.hasOwn(document, "layout_review_file")) errors.push(`${label} 网页身份字段必须绑定审阅页文件`);\n  if (!receipt && document.confirmation_id !== record.confirmation_id)', '决定可选网页绑定');
  const start = text.indexOf('/** 校验 review.html、layout-nodes.json');
  const end = text.indexOf('/** 校验独立布局确认', start);
  if (start < 0 || end < 0) throw new Error('布局确认文件门边界缺失');
  text = text.slice(0, start) + (stack === 'phaser' ? phaserCheckFiles() : stack === 'threejs' ? threejsCheckFiles() : CHECK_FILES) + '\n\n' + text.slice(end);
  text = replaceOnce(text, 'const review = readBoundFile(context.projectRoot, record.layout_review_file, `${label}.layout_review`, errors);', 'const review = hasReview ? readBoundFile(context.projectRoot, record.layout_review_file, `${label}.layout_review`, errors) : null;', '可选网页文件');
  if (stack === 'phaser') {
    text = replaceOnce(text, 'const expectedLayout = review && nodes && image && layoutDecision\n      ? validateLayoutReviewFiles(record, context, { review, nodes, layoutDecision }, image, errors, `${label}.layout_review`)', 'const expectedLayout = nodes && image && layoutDecision\n      ? validateLayoutCandidateFiles(record, context, { review, nodes, layoutDecision }, image, errors, `${label}.layout_candidate`)', 'Phaser 布局候选文件门');
  } else {
    text = replaceOnce(text, 'if (review && nodes && image && layoutDecision) validateLayoutReviewFiles(record, context, { review, nodes, layoutDecision }, image, errors, `${label}.layout_review`);', 'if (nodes && image && layoutDecision) validateLayoutCandidateFiles(record, context, { review, nodes, layoutDecision }, image, errors, `${label}.layout_candidate`);', '布局候选文件门');
  }
  return text;
}

/** 只移除必填约束，网页一旦声明仍执行字段类型和原有双向身份比对。 */
function adaptSchema(source) {
  let count = 0;
  const text = source.replace(/("required"\s*:\s*\[)([\s\S]*?)(\])/g, (whole, start, body, end) => {
    if (!/"layout_review_file"/.test(body)) return whole;
    count += 1;
    return start + body.replace(/"layout_review_file"\s*,\s*/, '') + end;
  });
  if (count !== 2) throw new Error(`布局 Schema 网页必填边界数量变化：${count}`);
  JSON.parse(text);
  return text;
}

/** 原有 HTML 生成测试明确选择交互模式；追加默认 PNG 和异常用例。 */
function adaptGeneratorTest(source, stack) {
  let text = replaceOnce(source, 'try { assert.equal(await main(value.args()), 0); } finally { console.log = originalLog; }', 'try { assert.equal(await main([...value.args(), "--interactive-review"]), 0); } finally { console.log = originalLog; }', '原生交互生成测试');
  if (stack === 'phaser') {
    const start = text.indexOf('test("完整生成链保留兄弟定位参照、非根溢出和显式小安全区"');
    const end = text.indexOf('\ntest(', start + 1);
    if (start < 0 || end < 0) throw new Error('Phaser 兄弟参照审阅测试边界缺失');
    const body = replaceOnce(text.slice(start, end), 'await main(value.args())', 'await main([...value.args(), "--interactive-review"])', 'Phaser 兄弟参照交互测试');
    text = text.slice(0, start) + body + text.slice(end);
  }
  return text + `
test("默认静态布局只写 PNG 和事实，不创建审阅 HTML", async () => {
  const value = await fixture();
  assert.equal(await main(value.args()), 0);
  const result = JSON.parse(await readFile(join(value.root, "evidence/v2/generation-result.json"), "utf8"));
  assert.equal(Object.hasOwn(result, "layout_review_file"), false);
  assert.equal(Object.hasOwn(result, "layout_review_sha256"), false);
  await assert.rejects(readFile(join(value.root, "evidence/v2/review.html")), { code: "ENOENT" });
  for (const field of ["layout_annotation_file", "layout_nodes_file", "layout_decision_file"]) assert.ok((await readFile(join(value.root, result[field]))).length > 0);
});
`;
}

/** 默认文件门只要求真实必需文件；声明网页后仍需在 CLI 文件检查中报缺失。 */
function adaptCocosCliTest(source) {
  const start = source.indexOf('test("CLI --check-files 进入场景正式确认文件门"');
  const end = source.indexOf('\ntest(', start + 1);
  if (start < 0 || end < 0) throw new Error('Cocos CLI 布局文件门测试边界缺失');
  let body = replaceOnce(source.slice(start, end), '["layout_annotation", "layout_review", "layout_decision", "decision_record", "user_decision_receipt"]', '["layout_annotation", "layout_decision", "decision_record", "user_decision_receipt"]', 'Cocos 默认布局文件门');
  body = replaceOnce(body, '\n});', `
  assert(!result.errors.some((item) => item.includes("layout_annotation_confirmation.layout_review") && item.includes("文件不存在或路径越界")));
  // 显式声明网页后，CLI 仍必须检查真实文件而不是忽略网页证据。
  scene.layout_decomposition.layout_annotation.layout_review_file = "evidence/v2/missing-review.html";
  scene.layout_decomposition.layout_annotation_confirmation.layout_review_file = "evidence/v2/missing-review.html";
  await writeFile(join(root, REFERENCE_PATHS.scene), JSON.stringify(scene));
  output = "";
  console.log = (value) => { output += \`\${value}\\n\`; };
  try { await main([contractFile, "--project-root", root, "--stage", "V2", "--check-files", "--json"]); }
  finally { console.log = originalLog; }
  assert(JSON.parse(output).errors.some((item) => item.includes("layout_annotation_confirmation.layout_review") && item.includes("文件不存在或路径越界")));
});`, 'Cocos 显式审阅网页文件门');
  return source.slice(0, start) + body + source.slice(end);
}

/** 复用真实上游候选构造文件门，并测试 PNG 默认与网页身份不一致。 */
function adaptConfirmationTest(source) {
  return source + `
test("PNG 模式不依赖网页，但仍重算节点并绑定人工决定", async () => {
  const value = await fileBackedConfirmation();
  for (const field of ["layout_review_file", "layout_review_sha256", "layout_review_identity_sha256"]) delete value.record[field];
  for (const name of [value.decisionFile, value.receiptFile]) {
    const path = join(value.projectRoot, name);
    const document = JSON.parse(await readFile(path, "utf8"));
    for (const field of ["layout_review_file", "layout_review_sha256", "layout_review_identity_sha256"]) delete document[field];
    await writeFile(path, JSON.stringify(document));
  }
  const errors = []; validateLayoutAnnotationConfirmation(value.record, value.context, errors); assert.deepEqual(errors, []);
  const path = join(value.projectRoot, value.record.layout_nodes_file);
  const nodes = JSON.parse(await readFile(path, "utf8")); nodes.layout_nodes[0].target_bounds.x += 10;
  await writeFile(path, JSON.stringify(nodes));
  const tampered = []; validateLayoutAnnotationConfirmation(value.record, value.context, tampered);
  assert(tampered.some((error) => error.includes("重算") || error.includes("不一致")), tampered.join("；"));
});
test("可选网页拒绝空路径、半声明与决议绑定不一致", async () => {
  const empty = []; validateLayoutAnnotationConfirmation(confirmation({ layout_review_file: "" }), context, empty); assert(empty.some((error) => error.includes("layout_review_file")));
  const partial = confirmation(); delete partial.layout_review_file;
  const partialErrors = []; validateLayoutAnnotationConfirmation(partial, context, partialErrors); assert(partialErrors.some((error) => error.includes("网页身份")));
  const value = await fileBackedConfirmation();
  const path = join(value.projectRoot, value.receiptFile); const receipt = JSON.parse(await readFile(path, "utf8")); delete receipt.layout_review_file; await writeFile(path, JSON.stringify(receipt));
  const mismatch = []; validateLayoutAnnotationConfirmation(value.record, value.context, mismatch); assert(mismatch.some((error) => error.includes("layout_review_file")));
});
`;
}

/** 按原生来源或目标精确接入；其余文件原字节保持不变。 */
export function adaptOptionalLayoutReview(text, { stack, sourcePath, destination } = {}) {
  const prefix = PREFIX[stack];
  if (!prefix || typeof text !== 'string') return { text, transforms: [] };
  const source = text.replaceAll('\r\n', '\n');
  const asset = `skills/${prefix}-game-asset-integration/scripts/`;
  const name = sourcePath?.split('/').at(-1);
  let output = text;
  if (sourcePath === `${asset}generate_layout_annotation.mjs`) output = adaptGenerator(source);
  else if (sourcePath === `${asset}layout_review_bundle.mjs`) output = adaptBundle(source);
  else if (sourcePath === `${asset}generate_layout_annotation.test.mjs`) output = adaptGeneratorTest(source, stack);
  else if (stack === 'cocos' && sourcePath === 'skills/cocos-game-ui-layout/scripts/validate_ui_layout_contract.test.mjs') output = adaptCocosCliTest(source);
  else if (name === 'layout_annotation_confirmation.mjs' && destination?.includes('-domain-contracts/scripts/')) output = adaptConfirmation(source, stack);
  else if (name === 'layout_annotation_confirmation.test.mjs' && destination?.includes('-domain-contracts/scripts/')) output = adaptConfirmationTest(source);
  else if (name === 'scene-reconstruction-contract.mjs' && destination?.includes('-domain-contracts/scripts/')) {
    output = omitFirstReview(source, '    for (const key of ["layout_annotation_file",', '场景布局必填字段');
    output = replaceOnce(output, '    if (annotation.decomposition_confirmation_id !==', '    // 可选网页及摘要不能以半声明形式绕过身份关联。\n    if ((Object.hasOwn(annotation, "layout_review_file") && (!nonEmptyString(annotation.layout_review_file) || !/\\.html?$/i.test(annotation.layout_review_file))) || (!Object.hasOwn(annotation, "layout_review_file") && ["layout_review_sha256", "layout_review_identity_sha256"].some((key) => Object.hasOwn(annotation, key)))) errors.push(contractError(stage, contract, annotation, "布局审阅页字段不完整", { missing: "layout_annotation.layout_review_file", returnStage: "V2/PROPOSAL" }));\n    if (annotation.decomposition_confirmation_id !==', '场景网页半声明');
    output = replaceOnce(output, '    // 独立布局确认必须逐字段锁定同一最终 PNG，不能只复用上游拆解确认。', '    // 独立布局确认必须逐字段锁定同一最终 PNG，不能只复用上游拆解确认。\n    if (Object.hasOwn(annotation, "layout_review_file") !== Object.hasOwn(layoutConfirmation, "layout_review_file")) errors.push(contractError(stage, contract, layoutConfirmation, "布局审阅页必须在标注与确认中同时声明", { missing: "layout_annotation_confirmation.layout_review_file", returnStage: "V2/PROPOSAL" }));', '场景网页双向绑定');
  } else if (sourcePath === `${asset}validate_visual_layout_mapping.mjs`) {
    output = omitFirstReview(source, '  for (const field of ["layout_annotation_file", "layout_annotation_width",', '映射布局必填字段');
    output = omitFirstReview(output, '  for (const field of ["layout_annotation_file", "layout_review_file",', '映射布局非空字段');
    const marker = '  if (annotation.layout_annotation_schema !==';
    output = replaceOnce(output, marker, '  if ((Object.hasOwn(annotation, "layout_review_file") && (!isString(annotation.layout_review_file) || !/\\.html?$/i.test(annotation.layout_review_file))) || (!Object.hasOwn(annotation, "layout_review_file") && ["layout_review_sha256", "layout_review_identity_sha256"].some((key) => Object.hasOwn(annotation, key)))) errors.push(`${label}.layout_annotation.layout_review_file 必须是 HTML 路径且与网页身份同时声明`);\n  if (isObject(confirmation) && Object.hasOwn(annotation, "layout_review_file") !== Object.hasOwn(confirmation, "layout_review_file")) errors.push(`${label}.layout_annotation_confirmation.layout_review_file 必须与布局标注同时声明`);\n  if (annotation.layout_annotation_schema !==', '映射网页声明');
  } else if (stack !== 'cocos' && sourcePath === `skills/${prefix}-game-ui-layout/scripts/validate_ui_layout_contract.mjs`) {
    output = omitFirstReview(source, '  const required = ["layout_annotation_file",', 'UI 合同布局必填字段');
    output = omitFirstReview(output, '  for (const field of ["layout_annotation_file", "layout_review_file",', 'UI 合同布局非空字段');
    const marker = '  if (annotation.layout_annotation_schema !==';
    output = replaceOnce(output, marker, '  if ((Object.hasOwn(annotation, "layout_review_file") && (!isString(annotation.layout_review_file) || !/\\.html?$/i.test(annotation.layout_review_file))) || (!Object.hasOwn(annotation, "layout_review_file") && ["layout_review_sha256", "layout_review_identity_sha256"].some((key) => Object.hasOwn(annotation, key)))) errors.push("layout_annotation.layout_review_file 必须是 HTML 路径且与网页身份同时声明");\n  if (annotation.layout_annotation_schema !==', 'UI 合同网页声明');
  } else if (['work-item.schema.json', 'implementation-package.schema.json', 'evidence-manifest.schema.json'].includes(name) && destination?.includes('-domain-contracts/references/')) output = adaptSchema(source);
  return output === text ? { text, transforms: [] } : { text: output, transforms: ['optional-layout-review-html'] };
}
