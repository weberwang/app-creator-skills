# App 九宫格来源与运行读数

Flutter、Expo 和 ESP32 的九宫格遵循通用九宫格规范：按最终紧凑小图源图像素确定四边和最小显示框，实际固定角边按源像素 1 倍绘制，使用小图通过九宫格拉伸放大，禁止用大于显示框的大图缩小。V3 冻结紧凑小图源帧（宽高不大于 `minimumSize` 与目标显示框），V4 读取正式图片确认源帧尺寸，V5 按每个实际消费者核验。

Flutter 在现有 `production` 中使用 `outputPath`、`outputSize` 和 `slice: {left, right, top, bottom}`，新增 `nineSlice.minimumSize: {width, height}`。Expo 和 ESP32 的布局节点在 `nineSlice` 中记录 `implementation`、正式源图片 `sourcePath`、`sourceSize: {width, height}`、`border: {left, right, top, bottom}` 和 `minimumSize: {width, height}`。`implementation` 是项目实际能力；Expo 的 `capInsets` 只用于 iOS，其他平台与 ESP32 均依据项目使用的实现填写。源帧和边框是整数像素，显示框使用相同逻辑单位，且 `minimumSize` 及实际显示框宽高均不得小于 `sourceSize`。

V5 的 `runtimeContext.nineSliceMeasurements` 按实际节点和视口记录 `nodeId`、`conditionId`、`runtimeNodeId`、`sourcePath`、`sourceSize`、`border`、`displaySize`、`scale`、`transformScaleX`、`transformScaleY`。Flutter 放在对应条件的 `capture.nineSliceMeasurements`，`nodeId` 使用设计项 ID。读取实际绘制与源图尺寸，`scale` 和合成变换倍率必须严格固定为数字 `1`。没有专用 scale 属性的实现必须读取实际固定角边尺寸并与源像素计算倍率；无法取得实际值时保留未验证。每个节点的全部样本须分别覆盖冻结的最小宽和最小高，且每个显示框的中心保留正宽高、显示尺寸不小于源图。引用既有运行证据，视觉效果由用户检查。
