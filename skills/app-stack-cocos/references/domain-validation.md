# Cocos 领域校验接入

公共 Work Item 使用 [统一控制器](../../app-workflow-control/SKILL.md) 的格式与命令。原控制目录中的 schema、视觉清单和原生输入是独立领域合同，不是另一种公共 Work Item，也不驱动旧全局状态机。按[完整专业索引](specialist-skills.md)读取实际生产技能。

## 响应式与真实运行证据

实际模块：[responsive-viewport-contract.mjs](../../cocos-domain-contracts/scripts/responsive-viewport-contract.mjs)。

| 接口 | 合同与输出 |
| --- | --- |
| `validateResponsiveContract(value, {stage, scope})` | 校验设计分辨率、方向、18 项策略字段及 Creator 的 Canvas/Camera/Input 关系；返回错误数组 |
| `validateResponsiveEvidenceRecord(record, contract, options)` | 校验单条实际视口测量、backing/DPR、安全区、相机与输入证据；返回错误数组 |
| `validateResponsiveEvidenceManifest(value, contract, {stage, requiredUnits})` | 校验每个场景/显示层的代表视口、DPR 和同页 resize 覆盖；返回错误数组 |
| `normalizeRuntimeDpr(rawDpr)`、`expectedBackingSize(cssSize, physicalScale)` | 复用域内 DPR 与 backing 计算，不替代实际引擎测量 |

```js
import { validateResponsiveContract, validateResponsiveEvidenceManifest }
  from './.agents/skills/cocos-domain-contracts/scripts/responsive-viewport-contract.mjs';

const errors = [
  ...validateResponsiveContract(contract, { stage: 'V5' }),
  ...validateResponsiveEvidenceManifest(observations, contract, { stage: 'V5', requiredUnits }),
];
if (errors.length) throw new Error(errors.join('\n'));
```

`contract/observations/requiredUnits` 来自当前场景的真实合同和 Creator 运行记录，结构与完整正反例见该模块及配套 `responsive-viewport-contract.test.mjs`。不要从公共 Work Item 猜造这些数据。校验器检查结构、几何与证据覆盖，不自动判断截图显示效果。

## 生产工具

- 文档模板保留于 [project_doc_templates.mjs](../../cocos-game-orchestrator/scripts/project_doc_templates.mjs)，初始化器 [initialize_project_docs.mjs](../../cocos-game-orchestrator/scripts/initialize_project_docs.mjs) 接受当前公共工作项和项目相对路径；实际写入前必须通过范围与门禁检查。
- [validate_visual_manifest.mjs](../../cocos-game-asset-integration/scripts/validate_visual_manifest.mjs) 在 V3/V4/V5 分别校验拆解、资源与运行文件及视觉路线；按该技能给出的参数使用，不能以文件存在替代正式 UUID/SpriteFrame 回读。
- 帧动画、Spine、图片处理及布局工具见专业索引，保持原 CLI 输入和对应模板。

## 公共证据接线

将实际命令、退出码、合同与观察资料路径、错误列表保存到当前公共 `evidenceRoot` 内的 `cocos-domain-checks.json`。无错误且命令成功后，向公共 Evidence Manifest 的 `items` 增加 `category: "cocos-domain-checks"`、`status: "PASS"` 与项目相对 `path`；该 Manifest 继续绑定公共工作项、实施包和视觉阶段，并由 `evidenceRef.path` 引用。

领域报告是附加证据，不能替代真实编译、测试、导入回读、运行布局与交互证据；`NOT_RUN/FAIL` 必须原样保留。默认由用户检查截图。
