# 抠图与逐轮确认

需要把静态图处理成透明素材时，按实际 Alpha 像素和边缘类型选路线。每轮制作一份候选和同一候选的浅底、深底预览，交用户决定采用、指定返修或继续升级。等待期间保留该轮记录与原图，正式素材使用用户确认的版本。

## 选择处理路线

| 输入 | 本轮处理 | 用户要求返修或升级时 |
| --- | --- | --- |
| 纯色硬边 | 主体与底色分离明确、边缘无半透明时，沿用边缘连通色键，按实际底色和容差输出，绑定 `background-removal`。 | 定向调整底色或容差。封闭镂空残底、边角误删等局部问题使用独立灰度遮罩，采用 `mask-composition` 记录。 |
| 绿底毛发 | 使用软色键估算渐变 Alpha，再处理发丝边缘混入的绿底颜色。交付灰度遮罩，采用 `mask-composition`，边缘类型记为 `hair`。 | 绿色挑染、衣物或道具被误抠时补保护遮罩。底色不均或细发仍难分离时，使用独立 Alpha Matting 或人工灰度遮罩细化，再导入实际遮罩出图。 |
| 已有真实 Alpha | 解码检查可见前景和实际透明像素，保留原 Alpha。已验证的生成透明走 `direct-alpha`，用户提供或复用素材保留真实来源。 | 定向修边使用独立遮罩，或从源文件重新导出真实 Alpha。疑似烘焙的棋盘格随预览交用户辨认。 |

有 Alpha 通道但像素全部不透明时，按不透明图重新判定。已有图像的来源、生成能力和本次像素处理分别如实记录。独立遮罩保留处理前的原图，记录遮罩和成品，按[透明素材合同](../../app-domain-toolkit/references/reference-domain-visual-schema.md)交接。

## 每轮怎么交付

1. 从真实原图按本轮路线制作候选 PNG。保留尺寸、实际参数和处理记录。每个素材使用一个审阅目录，每轮在其下使用新的子目录，前一轮图、记录和预览都作为历史依据。
2. 给用户看同一候选的**浅底预览和深底预览**，说清处理了什么和重点看哪里。建议核对残留底色、断发、边缘色偏及主体误删。机器核对格式、尺寸、文件身份及 Alpha 像素。有实际候选时才提供对应预览。如果本轮无法产出可解码候选，说明失败原因和可选处理，等待用户决定。
3. 读取用户的真实回复并记录对应版本。「用这版」确认采用。「只修右边的绿边」按指定范围返修。「继续升级」执行下一种适用处理。返修或升级必须引用刚决定的上一轮，每条决定只开启一个后继。每次出新的双底预览并等待决定。技术检查通过、无回复或已展示均不能记作人工采用。
4. 采用后只交接该版素材及实际证据。在生成记录填写项目相对路径 `transparency_round_file`，引用本轮 `round.json` 和同目录的人工采用决定。V4/V5 按[现有验收](art-review.md)处理最终归一化成品。采用一轮不等于通过正式运行视觉验收。后续再次修透明边缘，使用修改后的真实候选重新审阅。批量生产可一次展示多项结果，决定须能对应到实际候选。

## 本地命令

在项目根目录运行。先准备一轮，提供输出的两张预览，收到用户回复后再记录决定。

~~~powershell
node .agents/skills/app-domain-toolkit/scripts/image/transparency-round.mjs prepare --source art/raw-item.png --round-dir Artifacts/transparency/item/r1 --route hard-edge --background-color "#00FF00" --tolerance 24
node .agents/skills/app-domain-toolkit/scripts/image/transparency-round.mjs prepare --source art/raw-hair.png --round-dir Artifacts/transparency/hair/r1 --route green-hair
node .agents/skills/app-domain-toolkit/scripts/image/transparency-round.mjs prepare --source art/provided-alpha.png --round-dir Artifacts/transparency/portrait/r1 --route existing-alpha
~~~

每个命令是对应路线的例子。采用、返修和升级分别使用 `--decision adopt`、`--decision revise`、`--decision upgrade`。人工依据使用真实消息引用，修订说明沿用用户表达。

~~~powershell
node .agents/skills/app-domain-toolkit/scripts/image/transparency-round.mjs decide --round Artifacts/transparency/hair/r1/round.json --decision upgrade --user-ref "<用户消息引用>" --feedback "保留绿色挑染，并细化右侧发丝"
node .agents/skills/app-domain-toolkit/scripts/image/transparency-round.mjs prepare --source art/raw-hair.png --round-dir Artifacts/transparency/hair/r2 --route green-hair --previous-round Artifacts/transparency/hair/r1/round.json --protect-mask art/hair-protection.png --alpha-mask art/hair-refined-alpha.png
~~~

`--protect-mask` 保护指定区域，白色保留源色和完全不透明度。`--alpha-mask` 接收现有 Alpha Matting 或人工生成的最终透明度遮罩。输入遮罩使用与原图同尺寸的不透明灰度 PNG，黑为透明，白为不透明，灰色表示中间值。绿底软色键默认底色为 `#00FF00`，只有已知实际底色时才修改 `--background-color`。遇到无足够主体和背景分离依据的图，让用户从真实预览决定是否换遮罩或重新出图。

生成式 `direct-alpha` 的 `raw_source_file` 与 `source_file` 均引用真实生成原图。逐轮工具保存的 PNG 副本用于人工审阅，正式交接通过 `transparency_round_file` 关联该副本及双底。归一化成品另生成对应的正式预览。
