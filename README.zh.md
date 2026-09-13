# dsh-web-search-plus

DeepSeek Harness (DSH) 原生网络搜索增强插件。

官方自带的搜索解析器会将模型生成的总结正文全部剥离、仅保留空链接。`dsh-web-search-plus` 采用双轨提取机制，完整保留模型的详细搜索解答、深度对比与 Markdown 格式，同时提取去重的网页来源与引用片段（Citations Snippet）。

支持任意兼容 Anthropic Messages 协议的后端（如 CPA 反代、Gemini 2.5 / 3.x 网关、OneAPI、NewAPI 及官方 Claude 接口）。

## 核心特性

- **完整正文保留**：模型生成的深度总结和回答完整传递给 DSH 主会话，告别只有链接没有内容的困扰。
- **引用精准配对**：将每条 URL 与对应文本块中的 `citations` 引用摘录绑定为 `snippet`。
- **通用协议设计**：标准 `/v1/messages` + `web_search_20250305`，不绑定特定供应商，随时可平滑升级切换后端。
- **强化搜索预算**：默认支持单次调用执行最多 8 次搜索 (`maxUses: 8`)，生成上限 8192 tokens。
- **无感挂载接管**：自带 `cordis.patch.yml`，一键无感接管 DSH 的 `ctx.web`，无缝提供增强型搜索 Provider。

## 安装方式

在 DSH 配置文件中安装：

```bash
dsh plugin --profile web add github:lldois/dsh-web-search-plus
```

本地调试安装：

```bash
dsh plugin --profile web add C:\Users\lldois\workspace\dsh-web-search-plus
```

## 配置项

可在 DSH 设置页 **插件配置 -> Web search plus** 中直观调整，或通过环境变量与 `settings.yaml` 配置：

| 配置键 | 默认值 | 说明 |
|---|---|---|
| `baseURL` | `http://100.78.146.24:8317/v1` | Anthropic 兼容端点 Base URL |
| `apiKeyEnv` | `WEB_SEARCH_API_KEY` | 存储 API Key 的环境变量名称 |
| `apiKey` | (空) | 可选直接填写的明文 Key |
| `model` | `gemini-3.7-flash-high` | 负责执行搜索与回答的后端模型 |
| `maxUses` | `8` | 单次搜索最多允许触发的模型搜索次数 |
| `maxTokens` | `8192` | 最大生成 Token 数 |
| `apiVersion` | `2023-06-01` | `anthropic-version` 请求头 |

## 开源协议

MIT License (c) 2026 lldois

## 可选：手动停用官方搜索插件

如果你希望在配置树中完全停用官方自带的 `web-search-deepseek`，可以在你的 profile 目录下（如 `~/.dsh/profiles/web/cordis.patch.yml`）添加：

```yaml
- id: web-search-deepseek
  disabled: true
```
