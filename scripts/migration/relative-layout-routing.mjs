/** 原生 UI 资料只维护技术实现，布局关系与浮层本体例外引用同一公共规则。 */
import { posix } from 'node:path';

const POLICY = 'skills/app-ui-layout/references/relative-layout.md';
const UI_ENTRIES = Object.freeze({
  unity: ['unity-game-visual-assets/SKILL.md'],
  cocos: ['skills/cocos-game-ui-layout/SKILL.md'],
  phaser: ['skills/phaser4-game-ui-layout/SKILL.md'],
  threejs: ['skills/threejs-game-ui-layout/SKILL.md'],
  flutter: ['adaptive-layout-implementation/SKILL.md', 'flutter-code-sketch/SKILL.md'],
});
const FLUTTER_ADAPTER = 'adaptive-layout-implementation/references/flutter-adapter.md';
const FLUTTER_OVERLAY = '- `Stack/Positioned` 仅用于真实叠层；登记 boundary、viewport scope、occlusion、fallback 和 test id。不得从目标图绝对坐标直接生成实现。';

/** 精确收窄旧叠层许可；不因原生 API 使用位置数值而删除正常的父级相对实现。 */
export function routeRelativeLayout(text, { stack, sourcePath, destination } = {}) {
  const isEntry = UI_ENTRIES[stack]?.includes(sourcePath) === true;
  const isFlutterAdapter = stack === 'flutter' && sourcePath === FLUTTER_ADAPTER;
  if (!isEntry && !isFlutterAdapter) return text;
  if (typeof text !== 'string' || typeof destination !== 'string') throw new TypeError('相对布局路由需要原生正文和目标路径');
  const href = posix.relative(posix.dirname(destination), POLICY);
  const reference = `[公共相对布局规范](${href})`;
  if (isFlutterAdapter) {
    const start = text.indexOf(FLUTTER_OVERLAY);
    if (start < 0 || text.indexOf(FLUTTER_OVERLAY, start + FLUTTER_OVERLAY.length) >= 0) {
      throw new Error('Flutter 叠层布局条款已变化，须重新审查相对定位边界');
    }
    const replacement = `- \`Stack/Positioned\` 可实现有明确父级或参照的相对关系；浮层本体的独立落位边界按${reference}执行。登记 boundary、viewport scope、occlusion、fallback 和 test id；叠层本身不构成内部控件使用屏幕固定坐标的理由。不得从目标图绝对坐标直接生成实现。`;
    return text.slice(0, start) + replacement + text.slice(start + FLUTTER_OVERLAY.length);
  }
  return `${text.trimEnd()}\n\n## UI 相对布局约束\n\nUI 布局与位置统一遵循${reference}。本栈父级、锚点、坐标换算及原生组件按技术约束实现；浮层本体与内部 UI 的边界按公共规范验收。\n`;
}
