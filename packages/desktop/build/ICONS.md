# 图标文件说明

本目录用于存放 electron-builder 所需的应用图标文件。

## 所需图标

### macOS
- **文件名**: `icon.icns`
- **格式**: ICNS (Apple Icon Image format)
- **推荐尺寸**: 包含多种分辨率 (16x16 到 1024x1024)
- **工具**: 可使用 [png2icons](https://github.com/idesis-gmbh/png2icons) 或在线工具转换

### Windows
- **文件名**: `icon.ico`
- **格式**: ICO (Windows Icon)
- **推荐尺寸**: 包含 16x16, 32x32, 48x48, 256x256
- **工具**: 可使用 [png2icons](https://github.com/idesis-gmbh/png2icons) 或在线工具转换

## 创建图标

### 从 PNG 创建

如果你有一个 1024x1024 的 PNG 图标，可以使用以下工具：

```bash
# 使用 png2icons（推荐）
npm install -g png2icons
png2icons icon.png . --icns --ico

# 或使用在线工具
# https://cloudconvert.com/png-to-icns
# https://cloudconvert.com/png-to-ico
```

### 临时方案

如果暂时没有图标，electron-builder 会使用默认的 Electron 图标。

## 注意事项

- 图标文件不应提交到 git（已在 .gitignore 中配置）
- 图标应为正方形，透明背景
- macOS 图标应遵循 Apple 的设计规范
- Windows 图标应包含多种尺寸以适应不同 DPI
