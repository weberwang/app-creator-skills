# Phaser 领域校验接入

公共 Work Item 使用 [统一控制器](../../app-workflow-control/SKILL.md) 的格式与命令。原视觉清单、schema 和响应式合同作为独立领域输入维护，不解析为公共 Work Item 的旧格式。实际生产按[完整专业索引](specialist-skills.md)读取原名技能和脚本。

## 响应式接口

实际模块：[responsive-viewport-contract.mjs](../../phaser-domain-contracts/scripts/responsive-viewport-contract.mjs)。

| 接口 | 合同与输出 |
| --- | --- |
| `validateResponsiveContract(value, {stage, scope})` | 校验 18 项视口策略、Scale/Camera/Input、方向和设计分辨率；返回错误数组 |
| `validateResponsiveEvidenceRecord(record, contract, options)` | 校验单条 DOM/Canvas backing、DPR、相机、安全区、输入与 resize 测量；返回错误数组 |
| `validateResponsiveEvidenceManifest(value, contract, {stage, requiredUnits})` | 检查实际场景与显示层的独立运行轨迹、代表视口和 DPR 覆盖；返回错误数组 |
| `normalizeRuntimeDpr(rawDpr)`、`computeCanvasBackingSize(logicalSize, logicalToCssScale, cssToPhysicalScale)` | 复用计算规则，不把计算结果当运行观察 |

```js
import { validateResponsiveContract, validateResponsiveEvidenceManifest }
  from './.agents/skills/phaser-domain-contracts/scripts/responsive-viewport-contract.mjs';

const errors = [
  ...validateResponsiveContract(contract, { stage: 'V5' }),
  ...validateResponsiveEvidenceManifest(observations, contract, { stage: 'V5', requiredUnits }),
];
if (errors.length) throw new Error(errors.join('\n'));
```

输入结构及正反例见模块与配套 `responsive-viewport-contract.test.mjs`；`contract/observations/requiredUnits` 必须对应当前场景的实际测量，不能把公共阶段 PASS 转填为技术结果。

## 实际工具入口

- [initialize_project_docs.mjs](../../phaser4-game-orchestrator/scripts/initialize_project_docs.mjs) 在公共工作项范围内初始化 [project_doc_templates.mjs](../../phaser4-game-orchestrator/scripts/project_doc_templates.mjs) 的具体模板，工作项与写入路径使用项目相对路径。
- [validate_visual_manifest.mjs](../../phaser4-game-asset-integration/scripts/validate_visual_manifest.mjs) 按 V3/V4/V5、`--check-files` 和真实项目根执行拆解、资源与运行视觉合同检查。
- [image-inbetween-plan.mjs](../../phaser-domain-contracts/resources/frame-animation/scripts/image-inbetween-plan.mjs) 保留帧序、循环及中间帧规划；视频/图片到图集、Spine、原生布局与图片处理仍使用各自专业入口。

## 接入公共证据

把真实命令、退出码、领域输入路径和错误列表写入当前 `evidenceRoot` 内的 `phaser-domain-checks.json`；只有成功且无领域错误，才在公共 Evidence Manifest 的 `items` 增加 `category: "phaser-domain-checks"`、`status: "PASS"` 和项目相对 `path`。Manifest 仍绑定公共工作项、实施包和视觉阶段，经 `evidenceRef.path` 接入控制器。

附加领域报告不能替代 profile 的编译、测试、资源导入、运行布局和交互证据。截图默认由用户检查，结构和文件检查不代写人工视觉结论。
