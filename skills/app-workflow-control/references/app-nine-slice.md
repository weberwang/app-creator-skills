# App 九宫格来源与运行读数

Flutter、Expo 和 ESP32 的九宫格均按最终源图像素确定四边和最小显示框，实际固定角边按源像素 1 倍绘制。V3 冻结源帧，V4 读取正式图片确认源帧尺寸，V5 按每个实际消费者核验。

Flutter 在现有 `production` 中使用 `outputPath`、`outputSize` 和 `slice: {left, right, top, bottom}`，新增 `nineSlice.minimumSize: {width, height}`。Expo 和 ESP32 的布局节点在 `nineSlice` 中记录 `implementation`、正式源图片 `sourcePath`、`sourceSize: {width, height}`、`border: {left, right, top, bottom}` 和 `minimumSize: {width, height}`。`implementation` 是项目实际能力；Expo 的 `capInsets` 只用于 iOS，其他平台与 ESP32 均依据项目使用的实现填写。源帧和边框是整数像素，显示框使用相同逻辑单位。

V5 的 `runtimeContext.nineSliceMeasurements` 按实际节点和视口记录 `nodeId`、`conditionId`、`runtimeNodeId`、`sourcePath`、`sourceSize`、`border`、`displaySize`、`scale`、`transformScaleX`、`transformScaleY`。Flutter 放在对应条件的 `capture.nineSliceMeasurements`，`nodeId` 使用设计项 ID。读取实际绘制与源图尺寸，`scale` 和合成变换倍率必须严格为数字 `1`。没有专用 scale 属性的实现必须读取实际固定角边尺寸并与源像素计算倍率；无法取得实际值时保留未验证。每个节点的全部样本须分别覆盖冻结的最小宽和最小高，且每个显示框和源图的中心都保留正宽高。引用既有运行证据，视觉效果由用户检查。
