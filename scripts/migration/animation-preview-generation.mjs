/** 将已核对的公共图集算法改为仅在显式提供预览路径时创建播放网页。 */

/** 只替换唯一已审计的源码锚点，防止源变化被静默吞掉。 */
function replaceOnce(text, before, after, label) {
  const at = text.indexOf(before);
  if (at < 0 || text.indexOf(before, at + before.length) >= 0) throw new Error(`${label} 锚点缺失或重复`);
  return text.slice(0, at) + after + text.slice(at + before.length);
}

/** 图片和视频使用同一输出策略；预览路径显式存在时保持原有安全检查。 */
export function adaptAnimationPreviewGeneration(source, kind) {
  if (!['image', 'video'].includes(kind)) throw new TypeError('未知图集类型');
  const scope = kind === 'image' ? 'paths' : 'options';
  const resolver = kind === 'image' ? 'resolveProjectPath' : 'resolve';
  let output = source;
  output = replaceOnce(output,
    'const outputPreviewValue = input.outputPreview ?? input.output_preview ?? input["output-preview"] ?? `${outputSheet.replace(/\\.png$/iu, "")}.html`;',
    '// 只有显式指定播放预览路径才创建 HTML；显式空值不能伪装成未请求。\n  const previewKey = ["outputPreview", "output_preview", "output-preview"].find((key) => Object.hasOwn(input, key));\n  const outputPreviewValue = previewKey === undefined ? undefined : input[previewKey];', `${kind} 预览参数`);
  output = replaceOnce(output,
    'if (!nonEmptyString(outputReportValue) || !nonEmptyString(outputPreviewValue)) throw new VideoAtlasError("output-report 和 output-preview 必须是非空路径");',
    'if (!nonEmptyString(outputReportValue) || (previewKey !== undefined && !nonEmptyString(outputPreviewValue))) throw new VideoAtlasError("output-report 和显式 output-preview 必须是非空路径");', `${kind} 预览路径`);
  output = replaceOnce(output, `const outputPreview = ${resolver}(outputPreviewValue);`, `const outputPreview = previewKey === undefined ? undefined : ${resolver}(outputPreviewValue);`, `${kind} 解析预览`);
  output = replaceOnce(output,
    'if (extname(outputPreview).toLowerCase() !== ".html" && extname(outputPreview).toLowerCase() !== ".htm")',
    'if (outputPreview !== undefined && extname(outputPreview).toLowerCase() !== ".html" && extname(outputPreview).toLowerCase() !== ".htm")', `${kind} 预览后缀`);
  output = replaceOnce(output, 'const outputs = [outputSheet, outputReport, outputPreview];', 'const outputs = [outputSheet, outputReport, ...(outputPreview === undefined ? [] : [outputPreview])];', `${kind} 预览碰撞检查`);
  output = replaceOnce(output, `[${scope}.outputSheet, ${scope}.outputReport, ${scope}.outputPreview],`, `[${scope}.outputSheet, ${scope}.outputReport, ...(${scope}.outputPreview === undefined ? [] : [${scope}.outputPreview])],`, `${kind} 输出预检`);
  const render = kind === 'image' ? 'renderAtlasPreview' : 'renderVideoAtlasPreview';
  output = replaceOnce(output, `const previewHtml = ${render}({`, `const previewHtml = ${scope}.outputPreview === undefined ? undefined : ${render}({`, `${kind} 预览渲染`);
  output = replaceOnce(output, `preview: { file: ${scope}.outputPreview },`, `...(${scope}.outputPreview === undefined ? {} : { preview: { file: ${scope}.outputPreview } }),`, `${kind} 预览报告`);
  output = replaceOnce(output, `[${scope}.outputPreview, Buffer.from(previewHtml, "utf8")],`, `...(${scope}.outputPreview === undefined ? [] : [[${scope}.outputPreview, Buffer.from(previewHtml, "utf8")]]),`, `${kind} 预览输出`);
  return output;
}
