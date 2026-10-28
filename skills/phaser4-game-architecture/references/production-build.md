# 生产构建压缩与发布检查

新建或调整 Phaser 游戏的 Vite 生产构建、准备发布候选时读取本文件。采用 [Phaser 官方 Vite 模板的生产配置](https://github.com/phaserjs/template-vite/blob/main/vite/config.prod.mjs)作为本工作流的基础压缩要求；这是构建期压缩，不是完整的反编译加固。

## 配置接入

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-architecture-production-build.md#配置接入)。

```js
build: {
    // 生产包不生成源码映射，避免随公开产物泄露源码；开发调试配置独立维护。
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
        // 两轮压缩与官方模板一致；不额外开启属性名混淆，避免破坏动态访问和外部接口。
        compress: { passes: 2 },
        mangle: true,
        format: { comments: false }
    }
}
```

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-architecture-production-build.md#配置接入)。

## 生产 Source Map

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-architecture-production-build.md#生产-source-map)。

## Phaser Compressor 引擎裁剪

[Phaser Compressor](https://phaser.io/news/2024/05/phaser-compressor-released)通过 Web 界面选择引擎组件、目标浏览器与导出格式，生成较小的自定义 Phaser 引擎包。它用于包体优化，不处理业务代码加密或反编译保护。

1. 将 Compressor 纳入生产构建评估，先核实工具当前支持的 Phaser 精确版本、所需功能、导出格式和访问资格。官方早期介绍针对 Phaser 3，不能据此断言支持当前 Phaser 4；不支持、无访问资格或没有实测收益时，明确记录未采用原因，沿用项目现有引擎构建，不降级 Phaser 或自动购买订阅。
2. 依据实际场景、插件和运行时动态创建对象整理保留/移除清单，只裁剪已确认未使用的能力。保存可导出的配置；无法导出时记录可重建的完整选项，以及 Phaser 版本、生成方式、浏览器目标、导出格式和产物路径。
3. 将自定义引擎接入项目实际解析入口，统一业务、插件与构建器的 Phaser 引用；核对最终依赖图和产物，避免自定义引擎与 npm/CDN 完整引擎同时加载。同步核对类型声明对应版本、必要许可证和 Source Map 检查。
4. 使用相同游戏代码、资源、压缩方式和渠道条件对比裁剪前后的引擎及完整发布包体积，记录原始与实际采用的传输压缩口径。验证启动、场景切换及保留的物理、加载器、渲染和插件路径；缺模块、运行错误或无收益时调整裁剪方案，不用官方宣传比例替代测量。
5. 发布清单登记采用状态、版本、配置位置、实际入口、体积对比和功能验证结果；Phaser、插件或功能清单变化时重新评估并生成受影响候选。

## 验证与发布交接

1. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-architecture-production-build.md#验证与发布交接)。
2. 按项目现有入口执行相关类型检查和生产构建（例如已有的 `npm run typecheck`、`npm run build`），检查退出状态和最终产物；执行上述 Source Map 发布检查及 Compressor 适用性/采用结果核对。未声明的检查脚本不凭空调用。
3. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-architecture-production-build.md#验证与发布交接)。

## 可执行的产物检查

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-architecture-production-build.md#可执行的产物检查)。

## 本栈配套资料

- [Vite 官方说明](https://vite.dev/config/build-options.html#build-sourcemap)
