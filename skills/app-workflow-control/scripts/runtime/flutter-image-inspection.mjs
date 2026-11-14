import loadDependency from '../../../app-skill-runtime/dependencies.cjs';

/** 独立进程解码正式图片，只检查格式与像素尺寸，不判断画面或风格。 */
async function inspect() {
  const sharp = loadDependency('sharp');
  const image = sharp(process.argv[2], { animated: true, limitInputPixels: 100000000 });
  const metadata = await image.metadata();
  // 完整解码能发现损坏的数据段，不能以头部元数据冒充资源可读取。
  await image.raw().toBuffer();
  process.stdout.write(JSON.stringify({ width: metadata.width, height: metadata.pageHeight ?? metadata.height, pages: metadata.pages ?? 1, format: metadata.format, hasAlpha: metadata.hasAlpha }));
}

inspect().catch((error) => { process.stderr.write(error.message); process.exitCode = 1; });
