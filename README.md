# 译键 TransKey ⌨️

<div align="center">
  <img src="app-icon.png" alt="TransKey Logo" width="200"/>

  **一键即译的游戏快捷翻译工具**

  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

</div>

## 📝 项目简介

TransKey（译键）是一款为游戏玩家打造的极简快捷翻译工具。在国际服游戏里选中文字、按一下快捷键，翻译结果自动粘贴到聊天框——全程不用切出游戏。

「译键」谐音「一键」：按一个键，译好一句话。

### ✨ 主要特性

- 🚀 **一键翻译**：打完文字 → 按快捷键 → 自动替换为译文
- 🌍 **多语言互译**：中文、英文、日文、韩文、俄文等主流语言，目标语言支持"自动识别"（中文⇄英文智能判别）
- 🔌 **自定义引擎**：填入任意 OpenAI 兼容接口的模型即可使用（智谱、DeepSeek、OpenAI 等），API Key 支持隐藏显示
- 🎨 **MIUI 澎湃OS 风格界面**：渐变状态卡、大圆角列表、悬浮 Dock 导航，全局 MiSans 字体，窗口标题栏与内容一体化配色
- 🧩 **关闭最小化到托盘**：点击关闭按钮隐藏到任务栏托盘，后台继续提供翻译，可一键开关
- 🪶 **极简轻量**：Tauri 构建，窗口大小与位置自动记忆，白色沉浸式原生标题栏

## 🚀 快速开始

1. 从 [Releases](https://github.com/KAZANR/TransKey/releases) 下载最新版本并安装
2. 运行 TransKey，在「设置」页填入你的模型 API Key / 地址 / 模型名（支持任何 OpenAI 兼容接口）
3. 按需调整：源语言 / 目标语言、翻译快捷键、关闭是否最小化到托盘
4. 进游戏，选中文字，按快捷键！

## ⌨️ 默认快捷键

- macOS：`⌘ + T`
- Windows：`Alt + T`

（可在「设置 → 翻译快捷键」点击该行重新录制）

## 💡 使用方法

1. 在游戏中选中要翻译的文字
2. 按下翻译快捷键
3. 翻译结果会自动替换/粘贴到输入框
4. 回车发送

> 💡 开启「关闭时最小化到托盘」后，点击窗口 ✕ 会隐藏到任务栏托盘、后台保持可用；从托盘图标菜单选择「打开主页面」重新显示，或「退出」彻底退出。

## 🛠️ 技术栈

- 🖥️ **跨平台框架**：[Tauri](https://tauri.app/)（Rust + WebView）
- ⚛️ **前端**：React 18 + Vite + TailwindCSS + MiSans 字体
- 🦀 **后端**：Rust + 全局快捷键 / 剪贴板 / 存储 / 托盘插件

## 👨‍💻 开发指南

### 环境要求

- Node.js 16+
- Rust 1.70+
- macOS：Xcode Command Line Tools
- Windows：Visual Studio C++ 构建工具

### 开发命令

```bash
npm install        # 安装依赖
npm run tauri dev  # 开发模式
npm run tauri build # 打包
node scripts/generate-icons.mjs # 重新生成应用图标（修改 SVG 后执行）
```

## 📜 开源协议

本项目采用 MIT 协议开源

---

<div align="center">
  Made with ❤️ for Gamers
</div>
