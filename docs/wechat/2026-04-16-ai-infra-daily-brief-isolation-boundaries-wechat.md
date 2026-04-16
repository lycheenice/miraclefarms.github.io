---
published: true
wechat_published: true
---
# AI Infra 早报｜隔离边界开始进入推理基础设施默认设计

**日期：2026-04-16**

过去三天，AI Infra 这波更新最值得记住的，不是哪一个项目又多了一项 headline feature，而是多个核心项目开始重写“边界条件”。缓存系统不再默认所有请求共享同一套复用命名空间，传输层不再默认链路失败只靠上层自己兜底，GPU 互联也不再默认只要硬件宣称可用就应该自动打开。

更直接地说，推理系统开始把租户边界、故障边界和设备边界当成默认设计对象。这类变化通常没有新 kernel 或新 benchmark 那么显眼，但它更接近真实生产环境里的硬问题。

## 一、多租户隔离开始进入 KV 复用主链路

最明确的一条线来自 vLLM 和 LMCache。vLLM 这次把 `request.cache_salt` 透传进 LMCache 的多进程 connector[1]，让原本只在 API 层有意义的隔离字段，开始真正参与 lookup、retrieve 和 store 这些底层 KV 操作。

LMCache 也在把这件事补成完整体系。它先给多进程 adapter 接口普遍加上 `cache_salt` 形状[2]，再给 eviction policy 抽象加入 `is_user_level` 和 `cache_salt` 扩展点[3]。意思很清楚，缓存系统不再默认“全局共享 + 全局 LRU”就够了，而是在为按用户配额、按用户驱逐的治理方式铺路。

与此同时，LMCache 还新增了 L1 lifecycle subscriber[4]，开始采样记录 chunk lifetime、idle-before-evict 和 reuse gap。缓存一旦进入多租户治理阶段，团队要关心的就不只是命中率，还包括这些 block 为什么留下、为什么被赶走、以及被赶走之后为什么又很快回来。

## 二、故障切换和分层存储开始被当成正常状态

Mooncake 这几天最有代表性的变化，是它把原本存在但没有真正生效的 failover 逻辑正式接上线[5]。一旦 transport 失败，系统会沿优先级链路自动切到下一条路径，同时记录 failover 次数、输出结构化日志，并把计数做成 Prometheus 指标。

这件事的价值不在于“终于有 failover 了”，而在于系统开始默认承认链路失败是会发生的，而且应该被控制、限制和观察，而不是等上层碰到报错再临时处理。

Mooncake 还把 SSD offload 的吞吐、IOPS 和 P50/P90/P99 延迟都做成了标准指标[6]。这说明分层存储也不再只是容量不够时的应急开关，而开始成为可以被持续优化、持续观测的工程路径。

## 三、GPU 互联和上下文 ownership 不再被默认放大

设备边界这条线，在 llama.cpp 和 SGLang 上体现得特别明显。llama.cpp 把 CUDA P2P access 改成显式 opt-in[7]，原因是某些主板和 BIOS 组合下，即便硬件报告支持，自动打开之后仍可能引发崩溃或输出损坏。

它同时又把 NCCL communicator 的管理收回到 context[8]，让通信资源不再以更隐式的方式挂在 backend 生命周期里。方向很一致，多 GPU 通信不再只是“能建链就建链”，而是要有明确 ownership 和生命周期。

SGLang 对 Kimi-K2.5 图像预处理路径的修复[9]，则把这个问题暴露得更具体。之前 `grid_thws` 作为 CUDA tensor 在 TP ranks 之间传递时，会让每个 rank 都在 `cuda:0` 上被动拉起完整 CUDA context，每个进程额外吃掉大约 500 MiB 显存。修掉这条路径之后，框架等于明确拒绝了“上下文副作用无害”这种默认前提。

## 今天真正值得记住的判断

把这些更新放在一起看，AI Infra 正在进入一个更成熟、也更不好写 benchmark 的阶段。团队开始认真处理那些过去被当作环境前提的边界条件：缓存是不是天然共享，失败是不是异常而不是常态，设备互联是不是只要可用就该默认打开。

下一轮真正拉开差距的，未必是谁又多做了一个 headline 优化，而更可能是谁更早把隔离、故障和 ownership 做成默认可用、默认可观测、默认可控制的系统能力。

## 参考资料

[1] vLLM 透传 cache_salt 到 LMCache MP connector 以支持按用户隔离（GitHub PR：https://github.com/vllm-project/vllm/pull/39837）

[2] LMCache 为多进程 adapter 接口加入 cache_salt 参数（GitHub PR：https://github.com/LMCache/LMCache/pull/3029）

[3] LMCache 为 EvictionPolicy 加入 is_user_level 与 cache_salt 扩展点（GitHub PR：https://github.com/LMCache/LMCache/pull/3032）

[4] LMCache 新增 L1 lifecycle subscriber 观测缓存块生命周期（GitHub PR：https://github.com/LMCache/LMCache/pull/2986）

[5] Mooncake TENT 接通跨 transport failover 并加入安全限制与指标（GitHub PR：https://github.com/kvcache-ai/Mooncake/pull/1878）

[6] Mooncake 为 SSD offload 增加 throughput、IOPS 与延迟指标（GitHub PR：https://github.com/kvcache-ai/Mooncake/pull/1879）

[7] llama.cpp 将 CUDA P2P access 改为显式 opt-in（GitHub PR：https://github.com/ggml-org/llama.cpp/pull/21910）

[8] llama.cpp 将 NCCL communicator 管理收回到 context（GitHub PR：https://github.com/ggml-org/llama.cpp/pull/21891）

[9] SGLang 修复 Kimi-K2.5 路径下 TP ranks 被动创建 cuda:0 context 的问题（GitHub PR：https://github.com/sgl-project/sglang/pull/22858）
