# Cocos Creator 验证

Creator 工程验证取决于所选小版本、插件和当前 MCP 的实际可用能力。核对 AssetDB 就绪、导入完成、真实 UUID/子资源、脚本编译/类注册、相关 Console 日志、Prefab/Scene 树、组件属性、引用保存和当前目标平台。服务返回成功、文件存在、`.meta` 已出现或构建面板打开均不能证明应用已启动或资源可用。

阶段范围：V3 只核对工程验证类别与 Profile 的 `evidenceRequirements.assetImport`（`asset-import`），包括真实导入路径、AssetDB UUID/子资源、脚本产物和引用登记。无需此时实现或运行正式宿主 Scene。V4 才验收全部 `visual` 类别，并针对已验收资源检查正式 Creator Scene 的布局、交互和集成外观；节点树/Importer 读回不能代替用户检查图片质量。

以失败边界选择验证范围。纯 TypeScript 规则可跑工程里现有静态检查和目标单测。Creator 写入必须另有编辑器读回证据；构建选择已确认平台和真实可执行的 Build 工具。主代理应按实际变更范围选择测试等级，不为无关小改动强制全量构建。

将界面截图交给用户检查显示效果；工程状态证据不能代替美术人工验收。真机、上传、签名和发布需单独获得针对对象的明确授权。

来源：`skills/cocos-game-workflow-control/references/cocos-mcp-protocol.md`、`skills/cocos-game-architecture/references/production-build.md`、`skills/cocos-game-architecture/references/project-structure.md`。
