# 工作流路由评估

[路由用例](fixtures/task-routing-cases.json)保存真实提问风格的请求、项目线索，以及预期技术栈、编排模式和能力。`primary` 是主责，`required` 是必须协作的能力，`excluded` 是本任务应避开的能力。`stack: null` 表示概念查询可以直接回答，无需决定实施栈。

`node --test tests/task-routing-evals.test.mjs` 离线检查用例覆盖、期望一致性及临时项目安装结果。它用安装后的读取器核对所需能力和原生章节；自然语言的选择由下面的独立评估记录。

1. 对要重测的用例，使用 `stacks` 为临时项目安装技能。只向评估代理提供安装目录、`evidence` 和 `prompt`，让它按 `app-creator-workflow` 判断本轮路径。用例的 `kind`、`expected` 和旧结果留给评分者；需要对比修改前后时，沿用相同代理设置和输入。
2. 让评估代理给出实际选择的技术栈、模式、主责和协作能力，并附简短依据。评估止于选择环节，实施与验证命令不执行。每个用例独立判断，避免前一个答案影响下一个。
3. 对照 `expected` 逐项记录栈、模式、主责、必须协作的缺失与应避能力的误选。额外协作有明确独立职责时可保留，并记录依据。汇总时分别呈现直接命中、易误选、多能力组合和直接处理的结果。出现合理的不同解释，先复核用例范围与预期，再决定是否修订工作流。

评估设计参考[上游触发用例](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/c6ca6c4/evals/README.md#L24-L43)。
