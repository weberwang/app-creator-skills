# 页面效果图独立审阅提示

将模块阶段生成的页面效果图作为附件交给 Effect Image Reviewer，并附上模块效果图拷问记录、已审页面语义合同、`phase: sketch` layout-spec、Code Sketch Review、全局设计冻结和页面视觉表达预算。Reviewer 只在当前对话输出问题和方案，不修改或保存效果图；Controller 负责获得用户选择。以 Apple Human Interface Guidelines 的交互原则为依据，不要求复制其视觉风格。全局方向阶段不得调用本模板。

要求 Reviewer 分别报告：任务/状态/导航语义覆盖、无障碍和系统区域风险、视觉层级与品牌表达、Flutter 可实现性、资产影响、合同变化。若范围、状态、导航、滚动 owner、断点、无障碍或 ownership 发生变化，必须返回语义与 Code Sketch 阶段更新重审。
