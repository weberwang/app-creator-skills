/** 在唯一迁移链中接入五栈实际模板与校验器，原始源仓库始终只读。 */
import { adaptWebRelativeLayout } from './web-relative-layout-adapter.mjs';
import { adaptUnityRelativeLayout } from './unity-relative-layout-adapter.mjs';
import { adaptFlutterRelativeLayout } from './flutter-relative-layout-adapter.mjs';

/** 按原生来源精确适配，只合并真实命中的变换，不能用公共检查替代专业检查。 */
export function adaptRelativeLayoutContracts(text, options) {
  let output = text;
  const transforms = [];
  for (const adapt of [adaptWebRelativeLayout, adaptUnityRelativeLayout, adaptFlutterRelativeLayout]) {
    const result = adapt(output, options);
    output = result.text;
    transforms.push(...result.transforms);
  }
  return { text: output, transforms };
}
