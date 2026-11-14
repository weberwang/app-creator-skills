# Asset Manifest

在 `docs/design/pages/<page-name>/asset-manifest.md` 维护素材来源与制作事实，引用[设计还原合同](../../flutter-domain-contracts/references/design-reconstruction.md)的相同设计项及实现 ID。拆解展示可用编号源图或可核对区域；抽象组件框图不能证明完成，不要求只展示位图编号图。

设计还原合同承载设计项、实现方式、消费者与当前验证的机器映射，本清单登记素材事实，不复制第二份规格或确认状态。无图片可记录 `N/A: no bitmap or exported visual assets`，但仍须完成全部原生项拆解、规格与当前还原验证。

## Ownership And Coverage Audit

| 设计项 ID／源图区域／状态 | 父级／布局参照 | 实现 ID／方式 | 设计依据 | 当前组件或素材 | 全部消费者 | 当前证据 |
|---|---|---|---|---|---|---|
| 与合同相同 ID、目标图 x/y/w/h、condition IDs | 真实关系 | native / image / shared-image / dynamic | 结构、样式、状态为何符合当前目标 | 真实源码或正式路径 | 源码与符号 | implementationEvidenceRef |

## Confirmation Evidence

- Page:
- Frozen page image path:
- Frozen page image SHA-256:
- Design reconstruction path and SHA-256 (`designReconstructionRef`):
- Numbered overlay path: `.codex-workflow/visuals/pages/<page-name>/bitmap-confirmation-v<version>.png`
- Overlay version:
- Overlay SHA-256:
- Confirmed numbers:
- User decision:
- 确认用途与 scope：目标／拆解／布局／代表样本／正式资源／V5 完整组合分别记录真实消息；样本和单项替换不提升为整页通过。
- Confirmation time:
- Overall fidelity verdict:

## Internal Number Mapping

| No.／实现 ID | Visual role | 消费者／状态 | Box bounds／源帧 | 当前目标还原依据 | Decision/source/license | 背景／透明边距／边缘／切片或帧序 | 逻辑尺寸／输出像素／密度 | Flutter 正式路径／导入验证 | Status/fidelity |
|---|---|---|---|---|---|---|---|---|---|
| | | 独立／共享与全部消费者 | x/y/w/h on frozen image | 逐项依据 | reuse / adapt / generate / export / extract | 按适用性填写 | 按实际消费需求声明 | V4 实际来源及加载原始输出 | 不由文件存在推断视觉通过 |

Rules:

- Use the same number for repeated placements of one shared asset; list every placement and state.
- Use different numbers for distinct states or visually different outputs.
- V3 从 V2 已确认目标制定拆解和生产规格，V4 才取得、制作及导入。原生项的结构、尺寸、间距、字体、颜色、边框、形状和状态引用合同，不以默认控件、仅换色或一律切图替代。
- Record only the selected source, required prompt hash, failure reason, license, output, fallback, and fidelity result.
- 按受影响资产在现有映射或说明中补齐源帧、有效内容边界、透明留白、资源 scale、切片及目标逻辑显示尺寸；区分确认目标、测量、估计与适配规则，不新建重复素材清单。这些是交接要求，编号图脚本不验证真实 Flutter 导入或运行显示。
- 当前验证必须关联源码身份和可核验原始属性观测；任意非空说明或手写 PASS 不足。实质改变已确认拆解或布局时 RETURN 至最早受影响阶段，保留历史并作废受影响下游引用，不增加逐素材审批。
- Keep unselected candidates, repeated prompts, and intermediate exports transient.
