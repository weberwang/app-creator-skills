import { prepareFrame, compileAtlas, readAtlasFrame, validateAtlasManifest, validateFrameSources, validateProject } from '/core.mjs';
import { decodePng, digest, download, encodePng, jsonBlob, zipFiles } from '/web/io.mjs';

/** 保存当前工程、像素和播放状态。 */
const state = { project: null, images: new Map(), index: 0, playing: false, elapsed: 0, last: 0, undo: [], read: null, readIndex: 0, readPlaying: false, readElapsed: 0 };
/** 查找界面中已声明的控件。 */
const $ = id => document.getElementById(id);
const previewCache = new Map();
let listedFrames;
let loadingVersion = 0;
let draggedFrameId = null;

/** 将错误或操作结果展示在页面上。 */
function notice(message, error = false) {
  const node = $('message'); node.textContent = message; node.classList.toggle('error', error); node.style.display = 'block';
  clearTimeout(notice.timer); notice.timer = setTimeout(() => { node.style.display = 'none'; }, 5000);
}

/** 创建具备统一错误反馈的异步事件处理器。 */
function guarded(handler) {
  return async event => { try { await handler(event); } catch (error) { notice(error.message || String(error), true); } };
}

/** 深拷贝工程，用于撤销和保存。 */
function snapshot() { return structuredClone(state.project); }

/** 记录修改前状态并限制撤销栈占用。 */
function remember() {
  state.undo.push(snapshot());
  if (state.undo.length > 100) state.undo.shift();
}

/** 将来源文件解码并记录来源散列。 */
async function loadSource(blob) {
  const bytes = await blob.arrayBuffer();
  return { image: await decodePng(new Blob([bytes], { type: 'image/png' })), hash: await digest(bytes) };
}

/** 初始化临时 PNG 工程并按自然文件名顺序排列。 */
async function importImages(files) {
  const version = ++loadingVersion;
  const ordered = [...files].sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }) || a.name.localeCompare(b.name, 'en'));
  if (!ordered.length) return;
  const images = new Map(); const frames = [];
  for (const [index, file] of ordered.entries()) {
    const { image, hash } = await loadSource(file); const id = `frame-${index}`;
    images.set(id, image.data);
    frames.push({ id, source: file.name, sourceSha256: hash, width: image.width, height: image.height, durationMs: 1000 / 12, offset: { x: 0, y: 0 } });
  }
  if (version !== loadingVersion) return;
  const width = Math.max(...frames.map(frame => frame.width)); const height = Math.max(...frames.map(frame => frame.height));
  state.project = validateProject({ schema: 'frame-atlas-project/1', name: 'animation', canvas: { width, height }, anchor: { x: width / 2, y: height / 2 }, fps: 12, loop: true, frames, settings: { maxSize: 2048, padding: 2, target: 'cocos' } });
  state.images = images; state.index = 0; state.undo = []; state.playing = false; refresh();
  notice(`已导入 ${frames.length} 帧`);
}

/** 装载本地服务已验证的工作流来源。 */
async function loadWorkflow() {
  const version = ++loadingVersion;
  const response = await fetch('/api/workflow');
  if (!response.ok) throw new Error('读取工作流失败');
  const workflow = await response.json();
  if (!workflow) return;
  const images = new Map();
  for (const source of workflow.sources) {
    const response = await fetch(source.url);
    if (!response.ok) throw new Error(`读取来源失败：${source.name}`);
    const image = await decodePng(await response.blob());
    images.set(source.id, image.data);
  }
  if (version !== loadingVersion) return;
  state.project = validateProject(workflow.project); state.images = images; refresh();
}

/** 通过帧 ID 和 SHA-256 验证工程对应的原始图片。 */
async function openProject(file) {
  if (!state.project) throw new Error('请先导入对应的 PNG，或从工作流启动');
  const project = validateProject(JSON.parse(await file.text()));
  const original = state.project;
  if (project.origin || original.origin) {
    /** 工作流来源和公共播放设置在重排时保持绑定。 */
    const locked = ({ name, canvas, anchor, fps, loop, origin }) => JSON.stringify([
      name, canvas.width, canvas.height, anchor.x, anchor.y, fps, loop, origin?.reportSha256, origin?.sheetSha256, origin?.sourceSha256,
    ]);
    if (locked(project) !== locked(original)) throw new Error('工作流来源或已确认时间轴不匹配');
  }
  validateFrameSources(project.frames, original.frames, { lockDuration: Boolean(project.origin) });
  state.project = project; state.index = 0; state.undo = []; state.playing = false; refresh(); notice('工程已打开');
}

/** 将 RGBA 矩形转为可绘制的画布。 */
function pixelCanvas(data, width, height) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(data), width, height), 0, 0); return canvas;
}

/** 同一帧的像素只裁剪一次，拖动只更新位置。 */
function preparedImage(frame) {
  const cached = previewCache.get(frame);
  if (cached) return cached;
  const prepared = prepareFrame(frame, state.images.get(frame.id));
  const { width, height } = prepared.bounds;
  const result = { bounds: prepared.bounds, empty: prepared.empty, canvas: pixelCanvas(prepared.data, width, height) };
  if (previewCache.size >= 6) previewCache.delete(previewCache.keys().next().value);
  previewCache.set(frame, result);
  return result;
}

/** 绘制帧的逻辑位置，空帧只保留时间。 */
function drawFrame(context, prepared, frame, anchor, centerX, centerY, alpha = 1) {
  if (prepared.empty) return;
  const bounds = prepared.bounds;
  context.save(); context.globalAlpha = alpha;
  const image = prepared.canvas ?? pixelCanvas(prepared.data, bounds.width, bounds.height);
  context.drawImage(image, centerX + bounds.x + frame.offset.x - anchor.x, centerY + bounds.y + frame.offset.y - anchor.y);
  context.restore();
}

/** 绘制预览、公共锚点和选中帧裁剪边界。 */
function drawPreview() {
  const canvas = $('preview'); const context = canvas.getContext('2d'); context.clearRect(0, 0, canvas.width, canvas.height);
  if (!state.project) return;
  const project = state.project; const frame = project.frames[state.index]; const scale = Number($('zoom').value);
  const cx = canvas.width / 2; const cy = canvas.height / 2;
  context.save(); context.translate(cx, cy); context.scale(scale, scale); context.imageSmoothingEnabled = false;
  context.strokeStyle = '#8490a6'; context.lineWidth = 1 / scale;
  context.strokeRect(-project.anchor.x, -project.anchor.y, project.canvas.width, project.canvas.height);
  if ($('onion').checked) for (const index of [state.index - 1, state.index + 1]) {
    if (index < 0 || index >= project.frames.length) continue;
    const other = project.frames[index]; drawFrame(context, preparedImage(other), other, project.anchor, 0, 0, 0.2);
  }
  const prepared = preparedImage(frame);
  drawFrame(context, prepared, frame, project.anchor, 0, 0);
  if (!prepared.empty) {
    const { x, y, width, height } = prepared.bounds;
    const left = x + frame.offset.x; const top = y + frame.offset.y;
    const outside = left < 0 || top < 0 || left + width > project.canvas.width || top + height > project.canvas.height;
    context.strokeStyle = outside ? '#ffbd71' : '#d6eb9b'; context.lineWidth = 1 / scale; context.setLineDash([4 / scale, 3 / scale]);
    context.strokeRect(prepared.bounds.x + frame.offset.x - project.anchor.x, prepared.bounds.y + frame.offset.y - project.anchor.y, prepared.bounds.width, prepared.bounds.height);
  }
  context.setLineDash([]); context.strokeStyle = '#ffbd71'; context.lineWidth = 1 / scale; context.beginPath(); context.moveTo(-8 / scale, 0); context.lineTo(8 / scale, 0); context.moveTo(0, -8 / scale); context.lineTo(0, 8 / scale); context.stroke(); context.restore();
}

/** 重新绘制时间轴与检查器。 */
function refresh() {
  const project = state.project; $('empty').hidden = Boolean(project);
  if (!project) return;
  const frame = project.frames[state.index]; $('projectName').textContent = project.name; $('frameName').textContent = frame.source || frame.id;
  $('offsetX').value = frame.offset.x; $('offsetY').value = frame.offset.y; $('duration').value = frame.durationMs;
  for (const key of ['target', 'maxSize', 'padding']) $(key).value = project.settings[key];
  $('loop').checked = project.loop; $('fps').value = project.fps; $('anchorX').value = project.anchor.x; $('anchorY').value = project.anchor.y;
  const locked = Boolean(project.origin);
  for (const id of ['fps', 'loop', 'duration', 'anchorX', 'anchorY']) $(id).disabled = locked;
  $('packingHelp').textContent = ['phaser', 'unity'].includes(project.settings.target)
    ? '自动裁剪透明边，当前引擎按原方向打包。'
    : '自动裁剪透明边，并按排版需要旋转图集帧。';
  $('moveEarlier').disabled = state.index === 0;
  $('moveLater').disabled = state.index === project.frames.length - 1;
  $('position').textContent = `${state.index + 1} / ${project.frames.length}`; $('summary').textContent = `${project.frames.length} 帧 · ${project.fps} FPS`;
  $('seek').max = project.frames.length - 1; $('seek').value = state.index; $('seek').disabled = project.frames.length < 2;
  $('play').textContent = state.playing ? '暂停' : '播放';
  refreshTimeline(project);
  drawPreview();
}

/** 保持缩略图节点稳定，播放时只更新选择与变动后的帧。 */
function refreshTimeline(project) {
  const list = $('frames');
  if (listedFrames !== project.frames) {
    listedFrames = project.frames;
    list.replaceChildren(...project.frames.map(item => {
      const button = document.createElement('button'); button.className = 'frame';
      button.draggable = true;
      const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64;
      button.append(canvas, document.createElement('span'));
      button.addEventListener('click', () => {
        state.playing = false;
        state.index = state.project.frames.findIndex(frame => frame.id === item.id);
        state.elapsed = 0;
        refresh();
      });
      button.addEventListener('dragstart', event => {
        draggedFrameId = item.id;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', item.id);
      });
      button.addEventListener('dragover', event => {
        if (draggedFrameId === null) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        button.classList.add('drag-target');
      });
      button.addEventListener('dragleave', () => button.classList.remove('drag-target'));
      button.addEventListener('drop', event => {
        if (draggedFrameId === null) return;
        event.preventDefault();
        event.stopPropagation();
        const source = state.project.frames.findIndex(frame => frame.id === draggedFrameId);
        const target = state.project.frames.findIndex(frame => frame.id === item.id);
        draggedFrameId = null;
        button.classList.remove('drag-target');
        moveFrame(source, target);
      });
      button.addEventListener('dragend', () => {
        draggedFrameId = null;
        list.querySelectorAll('.drag-target').forEach(target => target.classList.remove('drag-target'));
      });
      return button;
    }));
  }
  project.frames.forEach((item, index) => {
    const button = list.children[index];
    button.setAttribute('aria-pressed', String(index === state.index));
    const [canvas, label] = button.children;
    const text = `${index + 1} · ${Math.round(item.durationMs)} ms`;
    if (label.textContent !== text) label.textContent = text;
    if (canvas.dataset.ready) return;
    canvas.dataset.ready = 'true';
    const prepared = preparedImage(item);
    const context = canvas.getContext('2d'); context.clearRect(0, 0, 64, 64);
    if (!prepared.empty) {
      const scale = Math.min(60 / prepared.bounds.width, 60 / prepared.bounds.height);
      const w = prepared.bounds.width * scale; const h = prepared.bounds.height * scale;
      context.drawImage(prepared.canvas, (64 - w) / 2, (64 - h) / 2, w, h);
    }
  });
}

/** 将帧移动到目标位置，让偏移和停留时间与该帧共同移动。 */
function moveFrame(source, target) {
  if (!state.project || source < 0 || target < 0 || source === target || target >= state.project.frames.length) return;
  remember();
  const frames = [...state.project.frames];
  const [frame] = frames.splice(source, 1);
  frames.splice(target, 0, frame);
  state.project.frames = frames;
  state.index = target;
  state.playing = false;
  state.elapsed = 0;
  refresh();
}

/** 从真实 JSON 和 PNG 文件回读图集。 */
async function readFiles(files) {
  const json = files.find(file => file.name === 'animation.json');
  if (!json) throw new Error('请选择 animation.json 与所有图集 PNG');
  const manifest = validateAtlasManifest(JSON.parse(await json.text()));
  const pages = [];
  for (const page of manifest.pages) {
    const file = files.find(item => item.name === page.file);
    if (!file) throw new Error(`缺少图集：${page.file}`);
    if (page.sha256 && page.sha256 !== await digest(await file.arrayBuffer())) throw new Error(`图集摘要不匹配：${page.file}`);
    const image = await decodePng(file);
    if (image.width !== page.width || image.height !== page.height) throw new Error(`图集尺寸不匹配：${page.file}`);
    pages.push(image);
  }
  state.read = { manifest, pages }; state.readIndex = 0; state.readPlaying = false; state.readElapsed = 0;
  const container = $('atlasPages'); container.replaceChildren();
  for (const page of pages) container.append(pixelCanvas(page.data, page.width, page.height));
  $('readbackStatus').textContent = `已读回 ${pages.length} 页，${manifest.frames.length} 帧`; drawReadback();
}

/** 按导出配置重建图集帧位置。 */
function drawReadback() {
  if (!state.read) return;
  const { manifest, pages } = state.read; const frame = manifest.frames[state.readIndex];
  const context = $('readCanvas').getContext('2d'); context.clearRect(0, 0, 320, 240); context.save();
  const scale = Math.min(1, 300 / manifest.canvas.width, 220 / manifest.canvas.height); context.translate(160, 120); context.scale(scale, scale); context.imageSmoothingEnabled = false;
  drawFrame(context, readAtlasFrame(manifest, pages, state.readIndex), frame, manifest.anchor, 0, 0); context.restore();
  $('readPosition').textContent = `${state.readIndex + 1} / ${manifest.frames.length}`; $('readPlay').textContent = state.readPlaying ? '暂停' : '播放';
}

/** 生成真实图集文件、目标引擎代码及可重开的工程。 */
async function exportAtlas() {
  if (!state.project) throw new Error('请先导入帧');
  const project = snapshot();
  let manifest; let files;
  if (project.origin) {
    const response = await fetch('/api/workflow/export', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(project) });
    const result = await response.json(); if (!response.ok) throw new Error(result.error || '工作流导出失败');
    manifest = result.manifest;
    files = result.files.map(item => ({ name: item.file, blob: new Blob([Uint8Array.from(atob(item.base64), ch => ch.charCodeAt(0))], { type: 'image/png' }) }));
  } else {
    const result = compileAtlas(project, state.images); manifest = result.manifest;
    files = await Promise.all(result.pages.map(async (page, index) => ({ name: manifest.pages[index].file, blob: await encodePng(page) })));
  }
  files.push({ name: 'animation.json', blob: jsonBlob(manifest) }, { name: 'project.json', blob: jsonBlob(project) });
  const response = await fetch(`/api/adapters/${encodeURIComponent(project.settings.target)}`);
  if (!response.ok) throw new Error('读取引擎适配代码失败');
  for (const item of await response.json()) {
    const source = await fetch(item.url); if (!source.ok) throw new Error(`读取适配代码失败：${item.name}`);
    files.push({ name: `adapter/${item.name}`, blob: await source.blob() });
  }
  await readFiles(files.map(item => new File([item.blob], item.name, { type: item.blob.type })));
  download(await zipFiles(files), `${project.name}.zip`); notice('图集已导出并回读');
}

/** 启动预览计时，依据帧时长累积而非固定刷新率。 */
function tick(now) {
  const delta = state.last ? Math.min(now - state.last, 250) * Number($('speed').value) : 0; state.last = now;
  if (state.playing && state.project) {
    const index = state.index;
    state.elapsed += delta;
    while (state.elapsed >= state.project.frames[state.index].durationMs) {
      state.elapsed -= state.project.frames[state.index].durationMs;
      if (state.index === state.project.frames.length - 1 && !state.project.loop) { state.playing = false; break; }
      state.index = (state.index + 1) % state.project.frames.length;
    }
    if (state.index !== index || !state.playing) refresh();
  }
  if (state.readPlaying && state.read) {
    const index = state.readIndex;
    state.readElapsed += delta;
    while (state.readElapsed >= state.read.manifest.frames[state.readIndex].durationMs) {
      state.readElapsed -= state.read.manifest.frames[state.readIndex].durationMs;
      if (state.readIndex === state.read.manifest.frames.length - 1 && !state.read.manifest.loop) { state.readPlaying = false; break; }
      state.readIndex = (state.readIndex + 1) % state.read.manifest.frames.length;
    }
    if (state.readIndex !== index || !state.readPlaying) drawReadback();
  }
  requestAnimationFrame(tick);
}

/** 按选定方向切换帧并停止播放。 */
function step(amount) {
  if (!state.project) return;
  state.playing = false; state.elapsed = 0;
  state.index = Math.max(0, Math.min(state.project.frames.length - 1, state.index + amount)); refresh();
}

/** 对数字字段进行范围校验并保留可撤销修改。 */
function numberChange(id, target, key, minimum = -Infinity, maximum = Infinity) {
  $(id).addEventListener('change', () => {
    if (!state.project) return;
    const value = Number($(id).value);
    if (!Number.isFinite(value) || value < minimum || value > maximum || $(id).value === '') { notice('输入数值超出有效范围', true); refresh(); return; }
    remember(); target()[key] = value; refresh();
  });
}

/** 将选择、编辑、播放和导出控件连接到工程状态。 */
function bindControls() {
  $('images').addEventListener('change', guarded(async event => { await importImages(event.target.files); event.target.value = ''; }));
  $('projectFile').addEventListener('change', guarded(async event => { if (event.target.files[0]) await openProject(event.target.files[0]); event.target.value = ''; }));
  $('readbackFiles').addEventListener('change', guarded(async event => { await readFiles([...event.target.files]); event.target.value = ''; }));
  $('saveProject').addEventListener('click', guarded(() => { if (!state.project) throw new Error('请先导入帧'); download(jsonBlob(state.project), 'project.json'); }));
  $('export').addEventListener('click', guarded(exportAtlas));
  $('prev').onclick = () => step(-1); $('next').onclick = () => step(1); $('first').onclick = () => { if (state.project) { state.index = 0; state.elapsed = 0; state.playing = true; refresh(); } };
  $('play').onclick = () => { if (state.project) { state.playing = !state.playing; state.elapsed = 0; refresh(); } };
  $('seek').oninput = () => { if (state.project) step(Number($('seek').value) - state.index); };
  $('undo').onclick = () => {
    if (!state.undo.length) return;
    const selectedId = state.project.frames[state.index].id;
    state.project = state.undo.pop();
    state.index = Math.max(0, state.project.frames.findIndex(frame => frame.id === selectedId));
    state.playing = false;
    state.elapsed = 0;
    refresh();
  };
  $('moveEarlier').onclick = () => moveFrame(state.index, state.index - 1);
  $('moveLater').onclick = () => moveFrame(state.index, state.index + 1);
  $('reset').onclick = () => { if (state.project) { remember(); state.project.frames[state.index].offset = { x: 0, y: 0 }; refresh(); } };
  numberChange('offsetX', () => state.project.frames[state.index].offset, 'x'); numberChange('offsetY', () => state.project.frames[state.index].offset, 'y');
  numberChange('duration', () => state.project.frames[state.index], 'durationMs', 1);
  $('fps').addEventListener('change', () => {
    if (!state.project) return;
    const fps = Number($('fps').value);
    if (!Number.isFinite(fps) || fps <= 0 || fps > 24) { notice('帧率必须大于 0 且不超过 24', true); refresh(); return; }
    remember(); state.project.fps = fps;
    // 显式修改正式帧率时重新设置所有帧时长，之后仍可逐帧调整停留时间。
    for (const frame of state.project.frames) frame.durationMs = 1000 / fps;
    refresh();
  });
  numberChange('anchorX', () => state.project.anchor, 'x'); numberChange('anchorY', () => state.project.anchor, 'y');
  numberChange('maxSize', () => state.project.settings, 'maxSize', 16, 8192); numberChange('padding', () => state.project.settings, 'padding', 0, 16);
  $('target').onchange = () => { if (state.project) { remember(); state.project.settings.target = $('target').value; refresh(); } };
  $('loop').onchange = () => { if (state.project) { remember(); state.project.loop = $('loop').checked; refresh(); } };
  $('zoom').oninput = drawPreview; $('onion').onchange = drawPreview;
  for (const [id, amount] of [['readPrev', -1], ['readNext', 1]]) $(id).onclick = () => { if (state.read) { state.readPlaying = false; state.readIndex = Math.max(0, Math.min(state.read.manifest.frames.length - 1, state.readIndex + amount)); drawReadback(); } };
  $('readPlay').onclick = () => { if (state.read) { state.readPlaying = !state.readPlaying; state.readElapsed = 0; drawReadback(); } };
  window.addEventListener('keydown', event => {
    if (!state.project || /^(INPUT|SELECT|TEXTAREA)$/.test(event.target.tagName)) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); $('undo').click(); return; }
    const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (!direction) return; event.preventDefault(); remember();
    const offset = state.project.frames[state.index].offset; offset.x += direction[0] * (event.shiftKey ? 10 : 1); offset.y += direction[1] * (event.shiftKey ? 10 : 1); refresh();
  });
  let drag = null;
  $('preview').addEventListener('pointerdown', event => {
    if (!state.project) return; event.preventDefault(); state.playing = false; remember();
    const offset = state.project.frames[state.index].offset; drag = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y, index: state.index };
    event.target.setPointerCapture(event.pointerId);
  });
  $('preview').addEventListener('pointermove', event => {
    if (!drag || !state.project) return;
    const canvas = $('preview'); const rect = canvas.getBoundingClientRect(); const zoom = Number($('zoom').value);
    const offset = state.project.frames[drag.index].offset;
    offset.x = drag.ox + Math.round((event.clientX - drag.x) * canvas.width / rect.width / zoom);
    offset.y = drag.oy + Math.round((event.clientY - drag.y) * canvas.height / rect.height / zoom); refresh();
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) $('preview').addEventListener(type, () => { drag = null; });
  const wrap = $('canvasWrap');
  wrap.addEventListener('dragover', event => event.preventDefault());
  wrap.addEventListener('drop', guarded(async event => { event.preventDefault(); await importImages([...event.dataTransfer.files].filter(file => file.type === 'image/png')); }));
}

bindControls();
loadWorkflow().catch(error => notice(error.message, true));
requestAnimationFrame(tick);
