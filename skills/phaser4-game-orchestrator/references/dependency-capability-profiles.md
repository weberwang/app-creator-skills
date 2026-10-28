# 依赖能力档与服务边界

本文件是 Phaser 项目按需依赖能力档和 API/服务边界的唯一权威定义。先复用浏览器、Phaser、TypeScript、Vite、现有依赖和项目原语，再按技术设计启用最小能力；初始化不得安装未被实际需求触发的依赖。

## 能力档

| 能力档 | 典型能力 | 启用边界 |
| --- | --- | --- |
| 核心档 | Phaser、TypeScript、Vite 及必要测试工具 | 仅项目基础运行、构建和测试所需 |
| 移动平台档 | Capacitor 与实际使用的原生插件 | 已批准 iOS/Android 容器或具体设备能力；每个插件单独验证 |
| 数据/API 档 | 网络客户端、账号、远程配置、云存档和序列化 | 已有明确 API/数据契约，平台原语和现有依赖不足 |
| 复杂玩法档 | 寻路、额外物理、ECS、脚本或行为系统 | 核心玩法复杂度证明自研轻量方案不足 |
| 高级视觉档 | Shader、Spine、后处理、Tilemap 或资产生产工具 | 冻结视觉方向和预算确实需要，并有目标平台证据 |
| 商业能力档 | 支付、广告、分析、崩溃报告 | 用户明确批准商业/数据能力、合规范围和发布渠道 |

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-orchestration-dependency-capability-profiles.md#能力档)。

## SDK 初始化归属

所有实际采用 SDK 的初始化调用、回调、幂等状态和初始化恢复统一放在 `src/platform/initialize-sdks.ts`，由应用装配入口一次投递；各 SDK 独立发起，不等待其他 SDK 或形成核心启动屏障。自身官方必需前置仍须核实，能力冲突只报告对应 SDK，不阻断其他分支或游戏首帧。业务能力接口及广告位运行期恢复保持模块所有权，详见[SDK 单文件独立初始化](../../phaser4-game-architecture/references/sdk-initialization.md)。

## API 与服务边界

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-orchestration-dependency-capability-profiles.md#api-与服务边界)。
