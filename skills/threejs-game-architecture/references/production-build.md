# 生产构建压缩与发布检查

新建或调整 three.js 游戏的 Vite 生产构建、准备发布候选时读取本文件。Terser 两轮压缩、标识符缩短、注释移除和生产 Source Map 显式关闭是本工作流的共同构建要求，配置依据 [Vite 官方构建选项](https://vite.dev/config/build-options.html#build-minify)；这属于构建期压缩，不是完整反编译加固。

## 配置接入

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-architecture-production-build.md#配置接入)。

```js
build: {
    // 生产包不生成源码映射，避免随公开产物泄露源码；开发调试配置独立维护。
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
        // 两轮压缩按共同构建要求执行；不额外开启属性名混淆，避免破坏动态访问和外部接口。
        compress: { passes: 2 },
        mangle: true,
        format: { comments: false }
    }
}
```

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-architecture-production-build.md#配置接入)。

## 生产 Source Map

- 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-architecture-production-build.md#生产-source-map)。

## 验证与发布交接

1. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-architecture-production-build.md#验证与发布交接)。
2. 按项目现有入口执行相关类型检查和生产构建（例如已有的 `npm run typecheck`、`npm run build`），检查退出状态和最终产物；执行上述 Source Map 发布检查。未声明的检查脚本不凭空调用。
3. 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-architecture-production-build.md#验证与发布交接)。

## 可执行的产物检查

> 通用工作流步骤见[完整规范](../../app-domain-toolkit/references/reference-architecture-production-build.md#可执行的产物检查)。

## 本栈配套资料

- [Vite 官方说明](https://vite.dev/config/build-options.html#build-sourcemap)
