# 响应式视觉验证

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/responsive-visual-validation.md#响应式视觉验证)。

## 目录

- [适用阶段与结论](#适用阶段与结论)
- [契约输入](#契约输入)
- [每视口证据字段](#每视口证据字段)
- [只读验证 Hook](#只读验证-hook)
- [假通过禁令与证据要求](#假通过禁令与证据要求)
- [根因分类](#根因分类)
- [脚本用法](#脚本用法)

## 适用阶段与结论

- **V2**：确认契约是否定义浏览器 viewport、Canvas、逻辑坐标、safe area 四层关系，
  FIT/RESIZE/COVER、响应式锚点和断点重排，背景覆盖目标，留白/裁切/拉伸许可，
  代表性视口，以及动态文本、显隐、滚动、触控、resize 和项目支持方向策略。方向以
  `orientationPolicy.allowed` 为准；单方向项目只覆盖该方向，双方向项目才要求方向切换。
  只有 `exact` 或项目明确要求时才冻结完整的基准/最窄/最宽/支持方向/安全区矩阵。缺少影响可用性的核心关系才输出
  `响应式契约缺失`，阻断 V3。
- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/responsive-visual-validation.md#适用阶段与结论)。

## 契约输入

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/responsive-visual-validation.md#契约输入)。

正式使用 [Phaser UI 完整模板](../../phaser4-game-ui-layout/assets/ui-layout-contract-template.yaml)（schema 1.2.0）。

```json
{
  "schema_version": "1.2.0",
  "contract_version": "1.1.0",
  "scope": {
    "scenes": ["MainScene"],
    "states": ["default"],
    "bindings": {
      "code_candidate": "sha256:<64 位小写十六进制>",
      "visual_baseline": "1.0.0"
    }
  },
  "fidelity": { "applicability": "not-applicable", "status": "not-applicable" },
  "frozen_visual_target": null,
  "visual_validation": { "mode": "usability" },
  "applicability": "scene",
  "orientationPolicy": { "allowed": ["portrait", "landscape"] },
  "viewport": {
    "mode": "full-viewport",
    "strategy": "RESIZE",
    "allowWhitespace": true,
    "whitespaceTolerancePx": 8,
    "backgroundCoverageTarget": 1,
    "backgroundFit": {
      "mode": "cover-v1",
      "sourceFocalPoint": { "x": 0.5, "y": 0.5 },
      "targetPoint": { "x": 0.5, "y": 0.5 }
    }
  },
  "safeArea": { "required": true },
  "resize": { "required": true, "trajectory": ["baseline", "narrow", "landscape"] },
  "viewports": {
    "baseline": { "width": 390, "height": 844 },
    "narrow": { "width": 360, "height": 800 },
    "wide": { "width": 1440, "height": 900 },
    "landscape": { "width": 844, "height": 390 },
    "safe-area": { "width": 390, "height": 844, "safeArea": { "top": 47, "bottom": 34 } }
  }
}
```

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/responsive-visual-validation.md#契约输入)。

`viewport.allowWhitespace` 未定义时必须输出 `decision_gap`，即使测量看似通过；
定义为 `false` 时四边空隙超过 `whitespaceTolerancePx` 失败。`mode: full-viewport`
仍表示单次截图要包含完整页面（允许的 safe area inset 仍需单独记录），但默认
`usability` 只需在代表性视口采集，不要求穷举所有断点和状态。`strategy: FIT` 的结论最多为
`fit_only`：只能证明等比不溢出，不得作为满屏、响应式重排或 safe area 通过。只有
`visual_validation.mode=exact` 或项目明确要求时，才将全部命名视口和严格空隙阈值作为硬门。

## 每视口证据字段

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/responsive-visual-validation.md#每视口证据字段)。

## 只读验证 Hook

Phaser 内部背景、安全区、逻辑尺寸和关键 UI 无法从通用 DOM 泛化时，项目必须在
`window.__PHASER_VISUAL_VALIDATION__` 提供只读 Hook（可通过 `--hook` 改名）：

```js
window.__PHASER_VISUAL_VALIDATION__ = {
  version: 1,
  getSnapshot() {
    return {
      logicalCanvas: { width: 390, height: 844 },
      background: {
        rect: { x: -579, y: 0, width: 1548, height: 844 },
        sourceSize: { width: 1920, height: 1047 },
        fitMode: "cover-v1"
      },
      safeArea: { top: 47, right: 0, bottom: 34, left: 0,
        rect: { x: 0, y: 47, width: 390, height: 763 } },
      keyUiRects: { score: { x: 16, y: 63, width: 96, height: 32 } },
      cssScale: { x: 1, y: 1 }
    };
  }
};
```

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/responsive-visual-validation.md#只读验证-hook)。

## 假通过禁令与证据要求

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/responsive-visual-validation.md#假通过禁令与证据要求)。

## 根因分类

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/responsive-visual-validation.md#根因分类)。

## 脚本用法

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/responsive-visual-validation.md#脚本用法)。

```powershell
node skills/phaser4-game-qa-performance/scripts/responsive-visual-validation.mjs `
  --url http://localhost:5173 `
  --viewports .\qa-viewports.json `
  --canvas-selector canvas `
  --contract .\ui-layout-contract.json `
  --identity .\responsive-evidence-identity.json `
  --output .\artifacts\responsive
```

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/responsive-visual-validation.md#脚本用法)。

```powershell
node --test skills/phaser4-game-qa-performance/scripts/responsive-visual-validation.test.mjs
```

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/responsive-visual-validation.md#脚本用法)。

## 统一高分屏运行证据

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/responsive-visual-validation.md#统一高分屏运行证据)。

## 本栈配套资料

- [`phaser4-game-ui-layout` 布局合同](../../phaser4-game-ui-layout/references/layout-contract.md)
