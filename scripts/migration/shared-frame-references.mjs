/** 从逐项审计的帧动画参考中抽取可证实一致的完整段落。 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildReferenceWorkflow } from './reference-workflow-common.mjs';

const STACK_SKILLS = Object.freeze({ cocos: 'cocos-frame-animation', phaser: 'phaser4-frame-animation', threejs: 'threejs-frame-animation' });
const REFERENCE_HASHES = Object.freeze({
  cocos: Object.freeze({
    'action-timing.md': '4ef4841837394553d3bccd510cd8d9dd297738bea173b6c272c4846232f8dd1a',
    'animation-direction.md': '82a64a8608e339aa4beefa1ab41592841055e061c17ed1c46896c6aeb8228482',
    'character-animation.md': 'ffe47bc4cfc19dd8ea95e5cbf704f99cd99b1107c27e7e35e7310d570dd41f0b',
    'effect-animation.md': '42db5b056df81e32008a48cb56f90fd8be81eb20b426fd8e190abd671097c9db',
    'image-inbetween.md': 'cb9c6bc64bae037f85c598161beb26bc8c0562f1c744ffaf9a4fe43e67c143ca',
    'intent-driven-design.md': '9f7e28d52ff82b16bdf4b9c3b2bf7fc729d8f43e3a9b7cd8db6174bc44af0328',
    'object-animation.md': 'f3ddc4103348f79f150d25ed04802b4ddde6f93ad5afc031f1efa7ef24cd9435',
    'region-planning.md': '5b21b909530751a6748dc6ed0c92de74912fc79362fbc8f0e1e1e31e876815fb',
    'ui-frame-animation.md': '5324ac1ff1b2e657650dfd26e45aa5d7bc60cea0e5c29a239efdadf27a05857a',
    'workflow-integration.md': '1d241edd508c50b454305f531e0b1cf62954aa7aef03531177c3087eabe6b96b',
  }),
  phaser: Object.freeze({
    'action-timing.md': 'a3404028268f5489b5cf6d258e83ab439b8e5defe40938ebe45c8347bfcf92f6',
    'animation-direction.md': '82a64a8608e339aa4beefa1ab41592841055e061c17ed1c46896c6aeb8228482',
    'character-animation.md': 'ffe47bc4cfc19dd8ea95e5cbf704f99cd99b1107c27e7e35e7310d570dd41f0b',
    'effect-animation.md': 'b9054b4b2e22e77fd56596928cd8f742e8154ba72707cf81c12c58a9af447c83',
    'image-inbetween.md': '5bea35c2b2b9cf395dc4bfb911f51408d229cc643a24963c7dc42dcd5f3108e1',
    'intent-driven-design.md': 'd657c9a60c0c2089bf85f1940d2122bdb762ca4187b1974e7b4df25ff1769712',
    'object-animation.md': 'f3ddc4103348f79f150d25ed04802b4ddde6f93ad5afc031f1efa7ef24cd9435',
    'region-planning.md': '7929cf4bce5222821bb1f1b87c324eb3683ccedac2f6e48498fdeebe7804e691',
    'ui-frame-animation.md': '5324ac1ff1b2e657650dfd26e45aa5d7bc60cea0e5c29a239efdadf27a05857a',
    'workflow-integration.md': '4be223dd80bfda1d93a98ed66ec5f821beeadd6b500842f0f642855b85ff923e',
  }),
  threejs: Object.freeze({
    'action-timing.md': '6a2f8809fee52cb094437d52dffbf7160ad8330960264dfb7d9a824828e3982e',
    'character-animation.md': '41f98feb20b43fa993a81bacbcd1b5b42ef1210936a09ce25cb8dde9dcdd87bd',
    'effect-animation.md': '1cb555d7eefa62fa9dc8d2564fec3f32371fb0b18fc63f975c650f600e431856',
    'image-inbetween.md': '75c9e330097d756038a68b1e201e5620980be8fc78c37bcbb296a8a629e752fe',
    'intent-driven-design.md': 'b7ecf4ef3200593a79aa92bc79c47538a699c837e9b1a0c73a3ed05e19bb5806',
    'object-animation.md': '1620726ad56b15c27de7055a1071372052de09485aa30cd028031ec28e123ca8',
    'region-planning.md': '3e1bdbb118049133645363a1ef864c0762261a92b04d6acb6da7920f141a8280',
    'ui-frame-animation.md': '833c71a85e0424d159b897a084e618c9fb9e4e400aeec2719da5826fef14e7fd',
    'workflow-integration.md': '7b8c6ea9b631bf8ad4deda8041b1bce3fbc5e6cd20ebe9d9d316e4d5fb118589',
  }),
});
const TITLES = Object.freeze({
  'action-timing.md': '帧动画动作与时间轴', 'animation-direction.md': '帧动画导演与动作指导',
  'character-animation.md': '角色帧动画', 'effect-animation.md': '特效帧动画',
  'image-inbetween.md': '图片帧来源与递归补帧', 'intent-driven-design.md': '帧动画意图与设计依据',
  'object-animation.md': '物体帧动画', 'region-planning.md': '帧动画区域规划',
  'ui-frame-animation.md': '界面帧动画', 'workflow-integration.md': '帧动画资源与工作流接入',
});

// 仅允许已逐栈核对一致的补帧命令进入公共资料，其他代码示例仍保留在原生资料。
const SHARED_INBETWEEN_EXAMPLE = '```powershell\nnode <skill-dir>/scripts/image-inbetween-plan.mjs `\n  --duration-ms 1000 --fps 6 --keyframes 2 --no-loop `\n  --output-plan evidence/animation.inbetween-plan.json\n```';

/** 将统一父目录或逐栈目录配置解析为源仓库根。 */
function sourceRepository(sourceRoot, stack) {
  if (typeof sourceRoot === 'string' && sourceRoot) return resolve(sourceRoot, `${stack}-skills`);
  if (sourceRoot && typeof sourceRoot[stack] === 'string' && sourceRoot[stack]) return resolve(sourceRoot[stack]);
  throw new TypeError(`帧动画参考缺少 ${stack} 源仓库`);
}

/** 仅审计源仓库跟踪的参考资料；未跟踪的个人文件不应阻塞迁移。 */
function trackedReferences(root, skill) {
  const prefix = `skills/${skill}/references/`;
  try {
    return execFileSync('git', ['-C', root, 'ls-files', '-z', '--', prefix], { encoding: 'utf8', windowsHide: true })
      .split('\0').filter((path) => path.startsWith(prefix) && path.endsWith('.md')).sort();
  } catch (error) { throw new Error(`无法读取帧动画参考的 Git 跟踪清单：${error.message}`); }
}

/** 从三栈完整资料构造独立主题计划；源清单或任何源字节变化都需要重新审查。 */
export function buildSharedFrameReferences({ sourceRoot, repositoryRoot, trackedFilesByStack }) {
  if (typeof repositoryRoot !== 'string' || !repositoryRoot) throw new TypeError('帧动画参考需要目标仓库根');
  const byFile = new Map(Object.keys(TITLES).map((file) => [file, []]));
  for (const [stack, skill] of Object.entries(STACK_SKILLS)) {
    const root = sourceRepository(sourceRoot, stack);
    const directory = resolve(root, 'skills', skill, 'references');
    const expected = Object.keys(REFERENCE_HASHES[stack]).sort();
    const prefix = `skills/${skill}/references/`;
    const provided = trackedFilesByStack?.[stack];
    if (provided !== undefined && !Array.isArray(provided) && !(provided instanceof Set)) throw new TypeError(`${stack} 跟踪文件清单必须是数组或集合`);
    const present = provided === undefined ? trackedReferences(root, skill) : [...provided].filter((path) => typeof path === 'string' && path.startsWith(prefix) && path.endsWith('.md')).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected.map((name) => `${prefix}${name}`))) throw new Error(`${stack} 帧动画参考清单变化，必须重新审查`);
    for (const name of expected) {
      const sourcePath = `skills/${skill}/references/${name}`;
      const bytes = readFileSync(resolve(directory, name));
      if (createHash('sha256').update(bytes).digest('hex') !== REFERENCE_HASHES[stack][name]) throw new Error(`${stack}/${name} 帧动画参考源摘要漂移，必须重新审查`);
      let text;
      try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
      catch { throw new Error(`${stack}/${name} 帧动画参考不是有效 UTF-8`); }
      byFile.get(name).push({ stack, sourcePath, text });
    }
  }
  const documents = [];
  const replacements = [];
  for (const [name, sources] of byFile) {
    if (sources.length < 2) throw new Error(`${name} 无足够技术栈来源，不能作为公共参考`);
    const stem = name.slice(0, -3);
    const result = buildReferenceWorkflow({
      id: `frame-reference-${stem}`,
      title: TITLES[name],
      sources,
      // 目录导航继续指向本栈锚点；步骤编号影响顺序，不能在规范化时抹去。
      canonicalize: (block) => {
        if (block.sourceHeading === '目录') return null;
        if (/^\s*(?:```|~~~)/.test(block.original) && !(name === 'image-inbetween.md'
          && block.sourceHeading === '首尾、关键帧与递归' && block.canonical === SHARED_INBETWEEN_EXAMPLE)) return null;
        const numbered = block.original.match(/^(\d+[.)]\s+)/);
        return { ...block, canonical: numbered ? numbered[1] + block.canonical : block.canonical };
      },
      reason: '帧动画参考逐源逐段比对，公共规则集中维护，技术栈资源路径、证据强度和原生实现保持独立。',
    });
    if (name === 'image-inbetween.md') {
      // 占位符指向当前栈迁移后的资源目录，不能假定其他栈已经安装。
      result.documents[0].content = result.documents[0].content.replace('\n\n## ', '\n\n示例中的 `<skill-dir>` 指当前技术栈的 `skills/<stack>-domain-contracts/resources/frame-animation` 目录（Cocos、Phaser、Three.js 分别使用 `cocos`、`phaser`、`threejs`）。\n\n## ');
    }
    documents.push(...result.documents);
    replacements.push(...result.replacements);
  }
  return { documents, replacements, repositoryRoot: resolve(repositoryRoot) };
}
