# Cocos Creator 架构与 AssetDB

## 工程发现

先检查根目录 `package.json`、`assets/`、`settings/` 与 `profiles/`，读取 Creator 项目标识、小版本、插件和有效工程状态。`package.json` 项目版本不是 Creator 编辑器版本；MCP 的静态版本提示也不能替代实际 Editor 发现。记录目标目录、已连接 Creator 实例、MCP 项目身份和当前能力列表。

工程组织是协作约定，按稳定模块组织 `assets/scripts/scenes/<scene-id>/`，场景保有自身的玩法、实体和常驻界面。只把真正跨模块复用的稳定代码放入共享目录。modal、popup 和 toast 的逻辑与资源放在独立 `display-layers/<id>/`，公共视觉身份通过 `visual.hostId` 记录宿主场景上下文，不合并资源或进度归属。若 Creator 原生适配使用 `hostSceneId`，仅将其解释为原生字段到 `visual.hostId` 的映射，不把前者写入公共控制记录。

先沿用已有资源目录，不建立重复树。编辑器数据库缓存与构建输出按当前 Creator 版本及 gitignore 管理，不从其中读取可编辑源资源。

## 实际 MCP 操作

开始编辑前检查并复用当前健康 Creator 和 MCP 服务，核对工程路径、编辑器版本和服务状态，随后执行 `tools/list` 并只使用当前返回的写入工具 Schema。文档提到的 MCP 工具名只作能力发现线索，不保证目标服务器实现它。

项目文件可用于 TypeScript、纯数据和原始图片；Creator Scene、Node、Component、Prefab、资源 UUID 绑定和导入由已连接 MCP 驱动。先写一批文件，再整体刷新并等待导入完成，避免逐文件重复刷新。刷新结果只有 `.meta` 存在时不代表编译、图片子资源或 UUID 已可消费。查询已生成 UUID、真实资源类型、SpriteFrame/Texture 子资源、编译和 Console 状态后再绑定。

保存后重新读出场景、节点树、组件属性、Prefab 和真实资源引用。批处理逐条核对实际子命令状态和读回结果。批次不是原子事务，失败后先定位已成功的写入和受影响对象，再进行定向修复；不能盲目重放整批。

不能操作时使用当前可用的无依赖工作继续；缺少编辑器证据就保持受影响工程验收未完成。不因 MCP 工具已连接推断任何写入或外部批准已经授权。

来源：`skills/cocos-game-architecture/references/project-structure.md`、`skills/cocos-game-workflow-control/references/cocos-mcp-protocol.md`。
