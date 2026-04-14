# 微信公众号格式规范

微信公众号版不是新的文章类型，而是同一篇 brief / essay 的渠道改写版。

## 目标

- 保留 GitHub.io 版本的核心判断
- 改写成适合公众号阅读和编辑器粘贴的 Markdown
- 正文主体不使用超链接语法，但参考资料中保留完整 URL，方便编辑与读者回查

## 输出路径

- 保存到：`/Users/lychee/mycode/miraclefarms.github.io/docs/wechat/YYYY-MM-DD-slug-wechat.md`
- 如果目录不存在，按需创建

## 正文规则

- 不使用 Markdown 链接
- 不使用 HTML anchor
- GitHub.io 版里的 `[[N]](url)` 或 `<a href="url">[N]</a>`，统一改写成纯文本引用 `[N]`
- 图可以保留；图注写法与 GitHub.io 版一致

这里的限制只适用于正文主体。参考资料部分需要保留完整 URL。

## 参考资料处理

微信公众号正文主体不放超链接，但 `## 参考资料` 或 `## 参考来源` 必须保留：

- 编号
- 来源标题 / repo 名称 / PR 标题
- 来源类型
- 完整 URL

示例：

```markdown
## 参考资料

[1] Elastic EP in SGLang: Achieving Partial Failure Tolerance for DeepSeek MoE Deployments（官方博客：https://www.lmsys.org/blog/2026-03-25-eep-partial-failure-tolerance/）

[2] Mooncake EP & Mooncake Backend（官方文档：https://kvcache-ai.github.io/Mooncake/python-api-reference/ep-backend.html）
```

如果来源是 GitHub PR，直接写成：

```markdown
[3] SGLang 为多 GPU diffusion 默认启用 CFG parallel（GitHub PR：https://github.com/sgl-project/sglang/pull/22763）
```

## 改写节奏

- 比 GitHub.io 版更短句、更口语，但不要写成营销文案
- 开头 1-2 段先把今天 / 本文最重要的判断说清
- 每节控制在 2-4 段，段落不要过长
- 如果原文有过密的引用或过长的技术铺垫，公众号版可以适当收束，只保留最支持判断的部分

## 自检

- 正文主体没有 Markdown 链接、HTML 链接
- URL 只出现在参考资料括号中
- 没有把 URL 混进标题或图注
- 改写后仍然保留原文的核心判断，而不是只剩新闻摘要
