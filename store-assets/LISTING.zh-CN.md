# Chrome 网上应用店文案（简体中文）

为 Chrome Web Store 的 **Chinese (Simplified) / 简体中文** 本地化列表准备。以下文案只介绍浏览器扩展，不暗示桌面应用已有中文界面。发布前请以当前扩展版本再次核对功能及隐私披露。

## 名称

Avorythm — AI 实时配音与字幕

## 简短说明

用 AI 为网页视频和音频添加实时配音与双语字幕；也可在同步播放器中暂停、跳转和导出视频。

## 详细说明

看外语视频、在线课程或听播客时，不必离开当前标签页。Avorythm 可以把所选 Chrome 标签页的音频翻译成你选择的语言：听 AI 配音、看原文和译文字幕，或只保留原声阅读译文。原声、配音、原文字幕和译文字幕四项都能单独开关，音量与字幕卡片也可以按需调整。

两种播放方式，适合不同场景：

• 在本页：保留原网页，尽量缩短实时配音和字幕的等待时间。
• 同步录制器与播放器：先在本地录制所选标签页，再通过独立播放器观看缓冲内容。可以暂停、跳转和全屏；录制仍可继续。完成后可按选定的声音组合构建 WebM，并将启用的字幕下载为 SRT。

扩展独立运行，不需要安装桌面应用、Python、FFmpeg 或虚拟声卡。界面提供简体中文、英文和波斯文。

如何开始：安装扩展，在设置中填入自己的 Google AI Studio Gemini API 密钥，确认所选标签页的音频可发送到 Google Gemini，选择目标语言，然后点击“开始翻译”。同步播放器还提供可选的精准路径：使用 Groq Whisper 转录、Gemini 翻译，并由 Gemini 3.1 Flash Live 生成配音；该路径需要单独的 Groq 密钥、访问权限和音频授权。服务提供商的免费额度、可用模型与速率限制可能变化。

隐私说明：只有在你主动开始后，所选标签页的音频才会发送到对应服务。精准路径的短音频片段会直接发送给 Groq Whisper，所得文本再发送给 Google Gemini。扩展没有广告、开发者运营的中转服务器或用户行为分析。API 密钥默认仅保留浏览器会话；可分别选择在此设备上记住 Gemini 或 Groq 密钥。设备副本不会同步，也不由扩展加密。关闭此选项会删除设备副本，清除密钥会同时删除设备与会话副本；同步录制暂存在 Chrome 的私有本地存储里，主动下载的文件保存在你的 Downloads 文件夹。普通四文件保存默认关闭。

受 DRM 保护的视频或 Chrome 内部页面可能无法直接录制。实时处理需要网络时间，无法保证零延迟或每句话都准确；请自行核对重要内容。

源代码：https://github.com/msmahdinejad/avorythm

使用指南：https://github.com/msmahdinejad/avorythm/blob/main/docs/HELP.zh-CN.md

隐私政策：https://github.com/msmahdinejad/avorythm/blob/main/PRIVACY.md

## 上传图片

按 `store-assets/README.md` 中的映射上传 `store-assets/zh-CN/` 的五张截图。中文小型宣传图和横幅分别为 `store-assets/promo-small-zh-CN.png` 与 `store-assets/promo-marquee-zh-CN.png`。如果商店只允许一组全局宣传图，优先使用英文版，同时保留中文截图和文案。
