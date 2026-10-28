# 动画单元与共用时间轴

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-action-timing.md#动画单元与共用时间轴)。

## 动作分析与时间轴

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-action-timing.md#动作分析与时间轴)。

## 动作分组

- 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-action-timing.md#动作分组)。

## 游戏时间先于来源

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-action-timing.md#游戏时间先于来源)。

## 共用质量与优化

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-action-timing.md#共用质量与优化)。

## 效果与性能平衡

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-action-timing.md#效果与性能平衡)。

## 运动、保持与循环

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-action-timing.md#运动保持与循环)。

## 视频节奏整理

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-action-timing.md#视频节奏整理)。

3. 将整理结果保存为独立派生视频，保留整幅空间布局、尺寸与朝向，再由抽帧工具裁区域，避免重复裁剪或原点失配。源中存在的音轨按当前任务合同维护与时间映射对应的处理，记录是否保留及处理配置。保留原视频与派生视频的路径、可选 SHA 追踪值、剪辑命令/配置及各段源时间到游戏时间的映射。生成器最短交付时长只影响源视频与映射，不改变各自动画时长，不用静止填充凑时长。
4. 将实际最终输入视频连同简短检查点直接交付人工验收；原视频已适配时直接验收原视频，发生整理时验收派生视频。用户对实际视频的确认同时接受其可见表现时序，不另行提交文字复述确认。缺失动作、不能平滑连接或其它验收失败先修正视频并重提，未通过前不抽帧，也不以计划在抽帧后补齐为由放行。验收核对实际路径、区域与时间映射，不以 SHA 为门；该身份变化时重新验收。通过后将该视频作为 `--input-video` 与合同中的 `source_video`；如记录 SHA，仅用于追踪且须对应实际抽帧输入。原视频、验收依据和时间映射保存在 Work Item 设计证据中，不伪造已有源视频事件。
5. 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-action-timing.md#视频节奏整理)。

抽帧后才发现时间问题时，可以按来源顺序删去未计划保持帧，或在已有帧槽位修正过渡姿态；保留已修正图片，重新连续编号，并保留剩余帧真实的来源时间戳；SHA 如有记录，只作可选追踪并须对应实际来源。更新来源映射、图集、报告与预览。现有合同要求来源时间戳严格递增，不支持交换来源顺序、复制来源帧或无来源的新帧；需要这些操作时，先将编辑结果保存为新的真实视频来源，人工验收该输入后再抽帧，并按需记录 SHA 与来源时间，再迁移修图成果，不以改写来源字段绕过校验。为落实已确认时间轴而整理源视频不需重复设计确认，但新的实际抽帧输入须人工重验；同一目标下调整游戏时长、阶段节奏、关键事件或有意停顿时更新内部记录并直接返修候选，若改变已确认的目标感受、核心动作方案、玩法语义或行为权限，先重新确认。

## 本栈配套资料

- [批次规划](./region-planning.md#视频条数与消耗比较)
- [测试与性能流程](../../../../app-stack-cocos/references/native-contracts.md#mode-cocos-game-qa-performance)
- [合批消耗比较](./region-planning.md#视频条数与消耗比较)
- [独立分辨率约定](./region-planning.md#图片分辨率约定)
- [职责边界](./workflow-integration.md#设计与美术的边界)
- [玩法与意图设计方法](./intent-driven-design.md)
- [效果与性能平衡](#效果与性能平衡)
- [衔接与循环设计](./character-animation.md#衔接与循环设计)
- [生成参数核对与来源空间](./region-planning.md#生成参数核对与来源空间)
- [区域规划](./region-planning.md)
- [多区域图片](./image-inbetween.md#多区域图片)
- [设计理念说明](./intent-driven-design.md#方案完成后阐述设计理念)
- [SKILL.md 的分类入口](../../../../app-stack-cocos/references/native-contracts.md#mode-cocos-frame-animation--分类入口)
