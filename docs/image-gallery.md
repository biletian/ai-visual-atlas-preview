# 同作品组图

一个 case 对应一个作者、一套已核实的提示词/公开通用模板。多图不新增 case。

- `image_set_verified: true` 仅在核实同组来源后设置。
- `images`: `[{url, thumbnail_url, width, height, alt, source_url}]`。第一项是现有封面。
- 保留 case 的 author/source_url/prompt/prompt_note；有通用模板时不冒称逐字生成输入。
- 无 verified 标记、空数组、视频都回退原展示。禁止把不同作者作品塞入一个数组；禁止裁开前后对照图充作多个输出。
- 桌面大图右侧竖排缩略图；点击仅替换当前图，提示词和作者不变。上下键切换组图，左右键仍是前后作品。
- 顶部工具栏固定，不随右栏长提示词滚走；关闭、收藏及前后作品都保留。

回归：node tests/image-gallery.cjs，node --check dist/app.js。
