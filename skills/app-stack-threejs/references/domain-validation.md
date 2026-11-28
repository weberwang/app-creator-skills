# Three.js 领域校验接入

公共流程使用 [app-workflow-control](../../app-workflow-control/SKILL.md) 的 Work Item。保留的原生 schema、世界视口、资源清单及运行观察是独立专业输入；原文中的旧全局状态、CLI 和审批字段不成为当前公共格式。按[专业索引](specialist-skills.md)读取完整专业规则。

## 世界视口与二维布局

Three.js 的 world-3d 使用 [world-viewport-contract.mjs](../../threejs-domain-contracts/scripts/world-viewport-contract.mjs)，不套用二维固定设计画布：

| 接口 | 输入与输出 |
| --- | --- |
| `validateWorldViewportContract(value, options)` | 相机类型/投影、坐标、renderer、预算及代表视口合同；返回错误数组 |
| `validateWorldViewportEvidenceRecord(record, contract, options)` | 单场景实际 renderer backing、相机、裁剪与输入观察；返回错误数组 |
| `validateWorldViewportEvidenceManifest(value, contract, {stage, sceneId, stateId, requiredUnits})` | 完整场景/状态视口矩阵与独立证据覆盖；返回错误数组 |
| `expectedWorldBackingSize(cssRect, effectiveDpr)` | 计算预计 backing，仍须与真实 renderer 结果核对 |

```js
import { validateWorldViewportContract, validateWorldViewportEvidenceManifest }
  from './.agents/skills/threejs-domain-contracts/scripts/world-viewport-contract.mjs';

const errors = [
  ...validateWorldViewportContract(contract, { stage: 'V5' }),
  ...validateWorldViewportEvidenceManifest(observations, contract,
    { stage: 'V5', sceneId, stateId, requiredUnits }),
];
if (errors.length) throw new Error(errors.join('\n'));
```

原子输入、字段和完整正反例见配套 `world-viewport-contract.test.mjs`。实际选择二维设计视口路线时，使用 [responsive-viewport-contract.mjs](../../threejs-domain-contracts/scripts/responsive-viewport-contract.mjs) 的 `validateResponsiveContract` 与 `validateResponsiveEvidenceManifest`；方向/DPR、Camera/Input、同页 resize 和显示层覆盖仍分别验证，不自动把一种路线改成另一种。

## 生产与构建

- [validate-model.mjs](../scripts/validate-model.mjs) 保留 GLB/gltf、外部 URI、坐标、材质、蒙皮/动画和预算校验，按该技能的 manifest 和命令运行。
- [create-game.mjs](../../threejs-game-runtime/scripts/create-game.mjs) 从完整 [Starter](../../threejs-game-runtime/assets/starter) 建立空目录工程，继续使用同一运行模块。Starter 的 `src/main.ts` 样例须按[固定架构模板](../templates/game-architecture.json)接入 `src/game/main.ts` 和 `HudOverlay`，再作为新项目的工程骨架。阶段 4 回读结构和接口；后续需要构建产物时按工程锁文件安装并执行 `npm run build`，构建结果与浏览器交互、视觉验收分别记录。
- [initialize_project_docs.mjs](../scripts/initialize_project_docs.mjs) 保留全部技术模板，在公共工作项范围和门禁内写入；帧动画、素材装配、原生 UI 及插件继续使用独立专业工具。

## 公共证据

将实际命令、退出码、独立领域输入路径及错误列表保存为当前公共 `evidenceRoot` 内的 `threejs-domain-checks.json`。成功且无错误后，以 `category: "threejs-domain-checks"`、`status: "PASS"` 和真实项目相对 `path` 加入公共 Evidence Manifest 的 `items`，保留工作项、实施包与视觉阶段绑定，再由 `evidenceRef.path` 引用。

附加报告不替代构建、测试、资源加载、真实运行布局和交互证据；默认由用户检查截图显示效果。
