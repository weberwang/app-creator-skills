# 工程与硬件

## 开工事实

将下列事实写入现有计划和设备规格，不凭 ESP32 名称推断具体硬件能力：

- 芯片具体型号、板卡及版本、Flash、可用内部 RAM、PSRAM 是否存在及可用方式。
- 屏幕控制器、总线、分辨率、旋转、色深与字节序、背光和复位；GPIO、总线频率与板级接线来源。
- 触控控制器及坐标变换，或按键/旋钮的去抖、长按、重复与焦点规则；无某输入时明确不适用。
- 工程实际 SDK、LVGL、BSP 与移植层版本、配置和构建目标；从工程清单、锁文件和本地工具输出确认，不只看示例代码。
- 外设、电源、联网、存储等仅纳入已确认需求，不默认增加蓝牙、云端、配网或 OTA。

ESP-IDF 的 `CMakeLists.txt`、`sdkconfig*`、`main/idf_component.yml` 和 `dependencies.lock` 是探测线索，须核实实际组件与目标。`platformio.ini` 须检查其 `platform`、`board` 和 `framework`，通用 CMake 文件不能单独证明 ESP32。缺少板卡事实时先推进独立业务逻辑与界面规格，暂停猜测引脚、驱动和烧录参数。

## 架构与所有权

优先复用适用的官方 BSP、显示/触控驱动和移植组件。ESP-IDF + LVGL 可评估 `esp-bsp`、`esp_lcd` 和 `esp_lvgl_port`，但必须先核对目标板卡、芯片、SDK 与 GUI 版本；不因组件存在就宣称已适配。新依赖记录来源、固定版本、许可、资源成本和采用理由。

按实际职责分开：板级初始化与驱动、GUI 端口、页面与共享控件、状态与业务、存储/通信服务。页面发出业务意图，服务返回状态；外设或网络回调通过受控消息更新 GUI，不持有随页面销毁而失效的控件指针。独立模块可测试，跨模块只共享明确接口，不为了目录数量拆分简单功能。

LVGL 默认不具备线程安全性。选定唯一 GUI 所有者与同步策略，使用 `esp_lvgl_port` 时按实际组件版本的 `lvgl_port_lock` / `lvgl_port_unlock` 合同访问 GUI，不再混入互不相干的锁。禁止在 ISR、长时阻塞回调或持有无关业务锁时直接改控件。销毁页面时停止计时器、动画与订阅，处理迟到消息和重复进入。

异步传输时，显示刷新完成通知须在硬件不再使用缓冲区后发出；不能在 DMA 刚提交时就回收或复用缓冲。驱动所有权、缓冲对齐与可 DMA 内存要求按实际平台确定，不假设 PSRAM 都可直接用于传输。图形任务、输入和耗时 I/O 解耦，避免 GUI 被阻塞。

SDK 接入的模块所有权遵循[公共 SDK 规范](../../app-domain-toolkit/references/reference-architecture-sdk-initialization.md)。本栈不默认新增隐私业务，按实际能力的授权需求执行。

## 配置与构建

复用项目已有构建目录、SDK 环境和进程。ESP-IDF 项目通常在已激活环境的工程根执行 `idf.py build` 和 `idf.py size`；先检查现有目标与配置，不能把 `idf.py set-target`、清空构建、修改分区表当成例行验证。`set-target` 会重建相关配置，应只在目标确需改变且范围明确时使用。

依赖锁文件由组件管理器生成，不手填伪造求解结果；是否纳入提交遵循工程策略和锁文件是否包含机器路径。正式配置、开发板参数、资源转换参数与可编辑 UI 源需可追踪；密钥和设备私有配置不写入技能模板或日志。`managed_components/` 与 `build/` 不作为手工维护源。

若使用可视化 UI 工具，保留其正式可编辑源与生成入口；生成代码只按工具合同扩展，业务逻辑放在稳定接口外，不以每次启动重建布局覆盖设计源。没有选用编辑器时，组件代码和必要配置就是正式源，不强制安装工具。

## 官方依据

- [ESP-IDF 构建工具与目标切换](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/tools/idf-py.html)
- [Espressif BSP](https://github.com/espressif/esp-bsp)
- [esp_lvgl_port 组件参考](https://components.espressif.com/components/espressif/esp_lvgl_port/versions/2.9.0/readme?language=en)
- [组件依赖锁文件](https://docs.espressif.com/projects/idf-component-manager/en/latest/reference/dependencies_lock.html)
- [LVGL 9.2 线程与同步](https://docs.lvgl.io/9.2/porting/os.html)、[显示刷新与缓冲](https://docs.lvgl.io/9.2/porting/display.html)

以上具体版本仅作核查依据，实施前读取项目所选版本的一手资料；不假设不同主版本 API 兼容。
