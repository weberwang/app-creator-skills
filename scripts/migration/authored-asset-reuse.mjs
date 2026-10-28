/** 对已有公共图片工具进行只读复用，来源和作者文件必须逐字节证明等价。 */
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync } from 'node:fs';
import { assertNoDestinationLinks } from './output-cleanup.mjs';

const REUSE = Object.freeze({
  'unity-game-visual-assets/scripts/png-raster.mjs': Object.freeze({
    destination: 'skills/app-asset-workflow/scripts/png-raster.mjs',
    sourceHash: '83e45c10224c12ee4d9f325550ddc8f974fbc03bb6ba379947de052e9f55f02e',
    destinationHash: '83e45c10224c12ee4d9f325550ddc8f974fbc03bb6ba379947de052e9f55f02e',
  }),
  'unity-game-visual-assets/scripts/remove-background-local.mjs': Object.freeze({
    destination: 'skills/app-asset-workflow/scripts/remove-background-local.mjs',
    sourceHash: '1ba9a1424bf5463d27a50526fa6f1105ec0ae3b405dc30f1d8da4b78b0be8596',
    destinationHash: '384f6744b778e62673b9347b576dfaac9c96c51e095388e17f61018aa4f09663',
    directEntry: true,
  }),
});
const TRANSFORM = 'reuse-existing-authored-asset-tool';

/** 只允许经过逐行审核的 Unity 两个来源指向已有公共作者文件。 */
export function authoredAssetReuseSpec(stack, sourcePath) {
  return stack === 'unity' && Object.hasOwn(REUSE, sourcePath) ? REUSE[sourcePath] : null;
}

/** 在迁移清单标记原生来源及公共资源目标，不授予覆盖公共目录的权限。 */
export function mapAuthoredAssetReuse(stack, sourcePath) {
  const spec = authoredAssetReuseSpec(stack, sourcePath);
  if (!spec) return null;
  return { destination: spec.destination, disposition: 'adapted',
    reason: '原生工具逐源核对后复用已有公共图片工具；只验证来源与作者文件，公共文件不由迁移器覆盖。',
    transforms: [TRANSFORM] };
}

/** 入口适配只允许替换唯一的原始导入和尾部 guard，其他代码不可改变。 */
function adaptSource(source, spec) {
  if (!spec.directEntry) return source;
  let text = new TextDecoder('utf-8', { fatal: true }).decode(source);
  const replacements = [
    ['import { fileURLToPath } from "node:url";', 'import { isDirectEntry } from "../../app-skill-runtime/direct-entry.mjs";'],
    ['if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();', 'if (isDirectEntry(import.meta.url)) await main();'],
  ];
  for (const [before, after] of replacements) {
    const first = text.indexOf(before);
    if (first < 0 || text.indexOf(before, first + before.length) >= 0) throw new Error('公共图片工具来源的 CLI 入口已变化');
    text = text.slice(0, first) + after + text.slice(first + before.length);
  }
  return Buffer.from(text, 'utf8');
}

/** 对清单、源文件与公共目标做只读核验；源数据省略时仍验证固定摘要和目标。 */
export function validateAuthoredAssetReuse({ root, entry, sourceBuffer }) {
  const spec = authoredAssetReuseSpec(entry?.stack, entry?.sourcePath);
  if (!spec || entry.destination !== spec.destination || entry.disposition !== 'adapted'
    || !Array.isArray(entry.transforms) || !entry.transforms.includes(TRANSFORM)
    || entry.sourceSha256 !== spec.sourceHash) throw new Error('公共图片工具的来源、目标或迁移记录不匹配');
  const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
  if (sourceBuffer !== undefined) {
    if (!Buffer.isBuffer(sourceBuffer) || hash(sourceBuffer) !== spec.sourceHash) throw new Error('公共图片工具来源摘要漂移');
    if (hash(adaptSource(sourceBuffer, spec)) !== spec.destinationHash) throw new Error('公共图片工具源适配结果不匹配');
  }
  // 这是只读白名单：目标任何祖先目录为链接或 Junction 时均拒绝访问。
  const target = assertNoDestinationLinks(root, spec.destination);
  if (!lstatSync(target).isFile()) throw new Error('公共图片工具目标不是普通文件');
  const actual = hash(readFileSync(target));
  if (actual !== spec.destinationHash || (entry.destinationSha256 && entry.destinationSha256 !== actual)) throw new Error('公共图片工具目标摘要漂移');
  return actual;
}
