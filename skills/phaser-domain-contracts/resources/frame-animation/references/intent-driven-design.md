# 从玩法与意图推导动作设计

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-intent-driven-design.md#从玩法与意图推导动作设计)。

## 从观看体验开始构思

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-intent-driven-design.md#从观看体验开始构思)。

## 先建立设计依据

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-intent-driven-design.md#先建立设计依据)。

## 设计师交付与验收检查点

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-intent-driven-design.md#设计师交付与验收检查点)。

| 共用交付 | 需要明确的内容 | 验收时如何使用 |
| --- | --- | --- |
| 设计依据与目标感受 | 导演兼任/独立安排及理由、负责职业、动画/区域、玩法或交互目的、真实基线路径、核心亮点与表演构思、已有约束与设计建议；说明具体表现怎样形成目标感受 | 用户先完整观看，判断吸引力、情绪/性格、节奏和亮点是否成立，再定位具体偏差 |
| 阶段时间轴与关键状态 | 当前建议的阶段区间、关键姿态/视觉状态意图、轨迹或形变、加减速与保持、事件时点、首次反馈和结束去向；标明已有切换权限与跨类型依赖 | 将实际候选的阶段与事件逐项对照，定位响应、峰值、衔接、循环或终态偏差 |
| 空间与显示约束 | 目标显示尺寸、镜头安排、主体朝向演变、资源坐标与画内运动、接触/附着关系、完整运动范围、层次遮挡和背景/透明边缘要求 | 在目标尺寸和实际使用背景中按运动过程判断身份、透视、范围、边缘与信息可读性，允许合理的遮挡与轮廓变化 |
| 采样与性能取舍 | 当前 FPS、帧数、输出 cell/图集规模及推导理由；说明保留的关键变化、已有加载/内存/并发预算、估算与实测的区别 | 核对资源与播放是否落实设计，性能结合相应运行证据判断，不能凭参数更高判定效果更好 |
| 分类交付与检查清单 | 对应职业的专属交付、检查对象、阶段/事件或切换路径、观看情境、预期可见现象及典型偏差；复合任务说明各职业交接版本 | V3 用真实候选与完整序列逐项人工审阅；V4 检查既有触发、事件与切换路径在 Phaser 中的实际消费 |

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-intent-driven-design.md#设计师交付与验收检查点)。

## 从关键事件推导时间轴

1. 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-intent-driven-design.md#从关键事件推导时间轴)。

## 方案完成后阐述设计理念

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-intent-driven-design.md#方案完成后阐述设计理念)。

## 带入现有阶段与交接

| 工作流位置 | 如何消费设计依据 |
| --- | --- |
| V2 动作分析与时间轴记录 | 在内部工件保存玩法目的、表现意图、时间约束、推导理由、阶段表和检查点；方案完成后向用户阐述设计理念与目标感受，暂停等待用户明确确认当前方案；不可推导且影响玩法的条件须先澄清 |
| V3 提示词与真实素材制作 | 用户确认当前动作方案后，把意图翻译成可执行提示词并在已有操作授权内制作真实候选：何时进入何种姿态、怎样加减速、何时出现事件、如何保持或结束；视频逐区域安排独立有效区间，图片按关键姿态与目标槽位制作 |
| V3 真实素材人工验收 | 直接展示真实候选/预览和简短检查点，先由用户完整观看吸引力、目标感受、表演亮点与节奏，再逐帧定位事件、连接和身份缺陷，记录用户结论及具体偏差；用户确认视频时序可同时认可其实际表现，不另行确认文字复述；不能只用文件门或总帧数证明意图达成 |
| V4 Phaser 接入与验证 | 核对实际播放率、触发、事件和既有切换机制，确认运行时没有加入额外等待或把装饰运动变成输入锁定；视觉显示仍由用户人工检查，运行测试按工作项等级执行 |

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-intent-driven-design.md#带入现有阶段与交接)。

## 方法来源与使用边界

> 通用工作流步骤见[完整规范](../../../../app-domain-toolkit/references/frame-reference-intent-driven-design.md#方法来源与使用边界)。

## 本栈配套资料

- [Animation Mentor：Timing and Spacing](https://www.animationmentor.com/blog/tutorial-animate-with-timing-and-spacing-in-mind/)
- [Steve Swink：Principles of Virtual Sensation](https://www.gamedeveloper.com/design/principles-of-virtual-sensation)
- [Riot：Clarity in League](https://www.leagueoflegends.com/en-us/news/dev/clarity-in-league/)
- [ちもん：像素攻击动画制作](https://note.com/stibium/n/n69992413d002?hl=en)
- [效果与性能平衡](./action-timing.md#效果与性能平衡)
- [游戏时间先于来源](./action-timing.md#游戏时间先于来源)
- [动画导演／动作指导](./animation-direction.md)
