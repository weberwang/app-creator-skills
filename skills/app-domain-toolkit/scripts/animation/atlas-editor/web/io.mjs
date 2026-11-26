/** 将二进制文件计算为可跨会话比较的 SHA-256。 */
export async function digest(bytes) {
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return 'sha256:' + Array.from(new Uint8Array(hash), value => value.toString(16).padStart(2, '0')).join('');
}

/** 解码实际 PNG 字节并保留用于核心处理的 RGBA 像素。 */
export async function decodePng(blob) {
  const signature = new Uint8Array(await blob.slice(0, 24).arrayBuffer());
  if (signature.length < 24 || ![137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => signature[index] === byte)) {
    throw new Error('需要有效的 PNG 图片');
  }
  const dimensions = new DataView(signature.buffer);
  const width = dimensions.getUint32(16);
  const height = dimensions.getUint32(20);
  if (!width || !height || width * height > 64 * 1024 * 1024) throw new Error('PNG 尺寸超出处理范围');
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  return { width: canvas.width, height: canvas.height, data: context.getImageData(0, 0, canvas.width, canvas.height).data };
}

/** 将图集像素编码为实际 PNG 文件。 */
export async function encodePng(page) {
  const canvas = document.createElement('canvas');
  canvas.width = page.width;
  canvas.height = page.height;
  canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(page.data), page.width, page.height), 0, 0);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG 编码失败')), 'image/png'));
}

/** 生成无需外部库即可读取的 ZIP CRC-32。 */
function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** 打包存储模式 ZIP，UTF-8 文件名可包含引擎目录。 */
export async function zipFiles(files) {
  const encoder = new TextEncoder();
  const locals = [];
  const central = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name);
    const bytes = new Uint8Array(await file.blob.arrayBuffer());
    const crc = crc32(bytes);
    const local = new Uint8Array(30 + name.length);
    const l = new DataView(local.buffer);
    l.setUint32(0, 0x04034b50, true); l.setUint16(4, 20, true); l.setUint16(6, 0x800, true);
    l.setUint32(14, crc, true); l.setUint32(18, bytes.length, true); l.setUint32(22, bytes.length, true); l.setUint16(26, name.length, true);
    local.set(name, 30);
    const entry = new Uint8Array(46 + name.length);
    const c = new DataView(entry.buffer);
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x800, true);
    c.setUint32(16, crc, true); c.setUint32(20, bytes.length, true); c.setUint32(24, bytes.length, true); c.setUint16(28, name.length, true); c.setUint32(42, offset, true);
    entry.set(name, 46);
    locals.push(local, bytes); central.push(entry); offset += local.length + bytes.length;
  }
  const centralSize = central.reduce((total, item) => total + item.length, 0);
  const end = new Uint8Array(22);
  const e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, centralSize, true); e.setUint32(16, offset, true);
  return new Blob([...locals, ...central, end], { type: 'application/zip' });
}

/** 通过浏览器保存单个用户主动请求的文件。 */
export function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

/** 将数据包装为 UTF-8 JSON 文件。 */
export function jsonBlob(value) {
  return new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
}
