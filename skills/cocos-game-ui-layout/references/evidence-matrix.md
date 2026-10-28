# UI 布局证据矩阵

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-evidence-matrix.md#ui-布局证据矩阵)。

effect-image 的同批 `layout-nodes.json` 是唯一 V3 布局事实源，scene contract 的 `layout_source.nodes_file`、annotation 与 confirmation 的 `layout_nodes_file` 必须共同指向它。布局审阅页是需要交互对照时按需生成的可读展示投影：必须与冻结参考图、历史 Stage A proposal、Stage B decision、唯一节点文件和标准布局 PNG 关联同批实际文件；它帮助人工检查关系，但不替代 PNG、F2 机器验收或 V5 真实运行证据，不能另建手工布局事实或回写 proposal。普通 UI schema 1.2.0 的合同字段另见[布局合同](./layout-contract.md)。产物目录、坐标映射、审阅页身份和确认字段详见[离线布局审阅产物](./layout-review-artifacts.md)。

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-evidence-matrix.md#ui-布局证据矩阵)。

## 默认高分屏运行矩阵

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-evidence-matrix.md#默认高分屏运行矩阵)。

普通 UI schema 1.2.0 仅使用 `not-applicable` 布局合同。effect-image 的 V3 目标与 V5 运行证据保存在 scene contract 和视觉清单，不再通过 UI 合同的 `specified`/`verified`、`critical_alignments` 或 `parity_cases` 保存副本；schema 2.0.0 UI 合同仅引用公共策略与场景合同。

## 最小轴

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-evidence-matrix.md#最小轴)。

## 证据类型

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-ui-evidence-matrix.md#证据类型)。

组合过大时可按等价类削减，但必须写出削减依据、未覆盖组合和风险。布局计算与 Cocos Node/UITransform 测试不得把绝对屏幕坐标当作所有视口的验收标准。
