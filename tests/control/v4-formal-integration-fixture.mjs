import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** 创建正式入口及图片的合成身份，供 V4 同批接入测试复用。 */
export function formalIntegrationFixture(repo, entryPath, assets = []) {
  const entryFile = join(repo, entryPath);
  if (!existsSync(entryFile)) {
    mkdirSync(dirname(entryFile), { recursive: true });
    writeFileSync(entryFile, '合成正式入口');
  }
  /** 对实际文件字节计算引用摘要。 */
  function reference(path) {
    return { path, sha256: createHash('sha256').update(readFileSync(join(repo, path))).digest('hex') };
  }
  return {
    entryRef: reference(entryPath),
    images: assets.filter((item) => item.assetType === 'image').map((item) => ({
      assetId: item.assetId, outputRef: reference(item.output), componentPath: `Canvas/${item.assetId}`,
    })),
  };
}
