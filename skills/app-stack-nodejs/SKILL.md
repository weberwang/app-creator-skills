---
name: app-stack-nodejs
description: 规划、开发或维护 Node.js 服务器项目时使用，覆盖 API、业务模块、数据库、后台任务、运行生命周期、测试与发布准备；不用于仅以 Node.js 作为构建工具的前端项目。
---

# Node.js 服务器技术栈

先读 [app-creator-workflow](../app-creator-workflow/SKILL.md) 与 [app-workflow-control](../app-workflow-control/SKILL.md)，复用公共工作项、F0–F4、执行与证据记录。本栈处理实际运行在 Node.js 上的 HTTP/API 服务、后台任务和消息消费者。`package.json` 本身不能证明是服务器；检查实际入口、服务端依赖、脚本及部署方式。

服务功能使用 `MODULE`，工程基础使用 `FOUNDATION`，跨模块验证使用 `INTEGRATION`，交付使用 `RELEASE`。本栈不使用 `SCENE`、`PAGE`、`DISPLAY_LAYER`，不建立 `visual`，不强制视觉基线、V0–V5、截图、生图或素材验收。带管理界面的产品按前后端模块分别选择技术栈，通过接口合同衔接。

按任务读取：

- 初始化、版本、语言和框架：读[工程基础](references/engineering.md)。
- 职责、依赖、目录与状态：读[架构规范](references/architecture.md)。
- 路由、输入、鉴权、错误与超时：读[接口规范](references/api.md)。
- 数据库、事务、并发、幂等和后台任务：读[数据与任务](references/data-and-jobs.md)。
- 测试、隔离和公共控制器：读[验证规范](references/verification.md)及[最终集成证据](references/integration-evidence.md)。
- 启停、配置、日志、可观测性和交付：读[运行与交付](references/operations.md)。

从公共能力进入时使用 `node .agents/skills/app-skill-runtime/read-native-mode.mjs nodejs <公共能力>`，只展开[原生手册](references/native-contracts.md)中所选模式。维护本仓库时将 `.agents/skills/` 换为 `skills/`。

优先复用项目已选框架、包管理器、数据库与模块组织；新项目优先评估 TypeScript 严格模式和适用的成熟框架，按需求决定，不默认安装整套平台或强制迁移既有语言。采用项目与部署目标支持的受维护 Node.js 版本，实施前核实实际 API。

普通本地代码和隔离测试自动执行。运行验证前检查已有进程，只复用明确属于当前项目且模式合适的实例；没有可复用实例才启动新服务。真实数据库写入、迁移、第三方调用、基础设施、付费、上传与生产发布按具体动作的授权执行，不把测试或发布准备当成这些操作的授权。
