# Unity 领域校验接入

公共流程只读写 [app-workflow-control](../../app-workflow-control/SKILL.md) 的 Work Item。原 Unity schema 和模板保留为专业工具的独立领域输入；其中 `baselineHash/actionLevel/stageReviews` 等字段不添加到公共 Work Item，也不驱动第二套状态迁移。技术档案中“唯一 schema/CLI”的原文仅描述原领域格式，当前公共入口以统一控制器为准。

## 原生验证接口

实际模块为 [unity-contract-validation.mjs](../../unity-domain-contracts/scripts/unity-contract-validation.mjs)，从原混合 CLI 提取完整原生校验区：

| 导出 | 输入与结果 |
| --- | --- |
| `validateWorkItem(context)` | 独立 Unity 领域上下文；返回规范化视图，非法字段或专业合同抛异常 |
| `validateImplementationPackage(package, context, projectRoot)` | 原生实施包、已校验上下文、真实项目根；校验 `.meta` 配对、GUID/Importer、序列化所有权、共享设置串行与唯一 Editor 写入者 |
| `validateEvidence(evidence, context, nativePackage, projectRoot)` | 当前原生包与真实项目根下的技术证据；绑定包身份并校验编译、Domain Reload、Editor 稳定性及对应可见合同 |
| `assertPathOwnership(path, allowedPaths, forbiddenPaths)` | 原生路径所有权断言；不授予写入权限 |
| `statusOf(value)`、`requiresExactApproval(context)`、`approvalMatches(context, approval)` | 原合同只读辅助判断；不能替代宿主用户授权或公共副作用门 |

原输入结构见领域资源中的 [schemas](../../unity-domain-contracts/schemas)，可执行正反例见仓库 `tests/unity-domain-delivery.test.mjs`。上下文、包和证据分别放在项目自己的领域资料目录，绑定当前公共 `workItemId` 与候选；不要把公共 JSON 直接传给上述原生接口，也不要填造 PASS 来适配形状。

```js
// 在项目的校验脚本中，按实际安装位置导入该模块。
import { validateWorkItem, validateImplementationPackage, validateEvidence }
  from './.agents/skills/unity-domain-contracts/scripts/unity-contract-validation.mjs';

// context、nativePackage、nativeEvidence 来自真实项目的独立 Unity 领域资料。
const checked = validateWorkItem(context);
const checkedPackage = validateImplementationPackage(nativePackage, checked, projectRoot);
validateEvidence(nativeEvidence, checked, checkedPackage, projectRoot);
// 全部检查完成后再保存实际输出；异常必须使命令非零退出。
```

## 专业生产工具

场景、布局、图片导入、2D/3D 动画与骨骼等生产接口仍按[专业技能索引](specialist-skills.md)读取。Toolkit 的完整包、Editor 工具、测试和 `.meta` 保留在 [unity-workflow-toolkit](../../unity-development-workflow/assets/unity-workflow-toolkit)；Job、YAML 模板、schema 与编译器保留在 [unity-development-workflow](../../unity-development-workflow)。Node 合同测试不能证明这些 Unity 工具已经在 Editor 中运行。

## 接入公共证据

把实际运行命令、退出码、输入资料路径与校验结果写入当前项目的 `.workflow-control/evidence/<work-id>/unity-domain-checks.json`。仅命令成功且无领域错误时，在公共 Evidence Manifest 的 `items` 中增加 `{ "category": "unity-domain-checks", "status": "PASS", "path": ".workflow-control/evidence/<work-id>/unity-domain-checks.json" }`；Work Item 的 `evidenceRef.path` 指向该公共 Manifest。保留 Manifest 的公共身份、实施包引用及视觉阶段绑定。

这份附加报告不能替代 profile 要求的真实 `compile/tests/asset-import/runtime-layout/runtime-interaction` 证据。截图显示效果由用户检查，原生结构校验不写人工视觉 PASS。
