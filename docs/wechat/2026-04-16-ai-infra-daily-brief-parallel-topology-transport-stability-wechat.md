---
wechat_published: true
---
# 今日焦点：拓扑约束松绑与传输故障转移走向生产稳定

**📅 2026-04-16**

> 中文：未来感 AI 基础设施控制台，展示并行拓扑路由图与传输链路切换面板，RDMA 到 TCP 故障转移路径高亮，Google 蓝红黄绿配色，扁平科技风，无文字，16:9
>
> English: A futuristic AI infrastructure control console showing parallel topology routing and transport failover panels with RDMA-to-TCP path highlighted, in Google blue-red-yellow-green palette, flat tech style, no text, 16:9

> 过去三天，两件性质不同的事情同时发生：SGLang 移除了以断言硬封的 PP 与混合分块预填充组合限制；Mooncake TENT 把一段从未被调用的跨传输故障转移代码激活，附带监控与重试上限。两件事都在说同一件事——AI Infra 正在从"让单条路径跑起来"进入"让组合路径跑稳"的阶段。

---

## 推理侧

**SGLang 移除 Pipeline Parallelism 与混合分块预填充兼容性限制[1]** - 此前 server_args.py 中有一条断言直接拒绝 PP + mixed-chunk 的组合，不是功能缺失，而是明确封死。这次在 Qwen3-32B（tp=2，pp-size=3，H800）充分验证后移除了这条限制，预期让需要同时使用流水线并行与混合分块预填充的部署场景不再需要绕路。

**TensorRT-LLM 回滚 Eagle3 动态树 speculative decoding[4]** - 理由是先稳住预合并 CI。回滚本身是正常的工程节奏，但和 SGLang 同期合并 Eagle3/DFLASH 修复对比，两个框架在 speculative decoding 推进节奏上的分化已相当明显，属于 **[持续更新]**。

**SGLang Kimi-K2.5 per-image ViT cache 优化[2]** 与 **vLLM pooling 端点前后处理线程池卸载[3]** - 前者把 ViT cache 与 TP CUDA context 创建路径分离，消除每个 rank 对 device 0 的冗余分配；后者修复了异步 tokenizer 引入的约 2ms 延迟回归，overhead 可忽略。两者都属于推理路径上的精度修整，属于 **[持续更新]**。

---

## 传输层

**Mooncake TENT 激活跨传输故障转移[5]** - 这件事的特殊之处在于代码早已存在。`resubmitTransferTask()` 有完整的 RDMA → TCP 故障转移逻辑，但整个函数此前从未被调用——是一段真正的死代码。这次 PR 把它接入 `getTransferStatus()`，同时补上最多 3 次的重试上限和 `tent_transport_failover_total` Prometheus 计数器。激活死代码，附带生产级保护。

**Mooncake TENT RDMA 生命周期加固[6]** - RDMA `EndPoint` 的原始指针改为 `weak_ptr`，从生命周期层面消除 failover 期间可能出现的悬垂指针风险。加上同期合并的 CUDA collective wait 语义与 NVLink 小传输完成路径修复，三个 PR 合起来，TENT 在复杂集群下的稳定性边界明显收紧，属于 **[持续更新]**。

---

## 生态与可观测性

**Ray Serve 将 SGLang 引擎提升为正式 user guide[7]** - 从 examples 目录移至 `_internal/serve/engines/sglang/`，与 vLLM 引擎并列，覆盖单节点、多节点 TP+PP、批量推理等场景。不再需要用户自己翻 examples 目录找集成方式——这是生态地位的变化，而不只是文档整理。

**LMCache per-request OTel 追踪[8]** 与 **llama.cpp NCCL communicator 上下文管理[9]** - 前者为 MP server 的 lookup_prefetch、retrieve、store 三类操作建立可追踪的 span 树，新订阅者两行配置即可接入；后者把 NCCL communicator 生命周期移入外部托管 context，解决与 backend 实例不对齐导致的崩溃，并为后续 AllReduce 以外的集合操作留出扩展接口，属于 **[持续更新]**。

---

> 一句话结论：**今天最值得记住的不是又多了哪些功能，而是一些原本写好却从未运行过的代码正在被激活，而原本以断言封死的组合正在被打开——系统的约束边界，正在被系统地拆除。**

---

## 参考

[1] SGLang 移除 Pipeline Parallelism 与混合分块预填充的兼容性限制：https://github.com/sgl-project/sglang/pull/22920

[2] SGLang 为 Kimi-K2.5 启用 per-image ViT cache 并修复 TP CUDA context 冗余分配：https://github.com/sgl-project/sglang/pull/22858

[3] vLLM 将 pooling 端点前后处理卸载至线程池，修复异步 tokenizer 引入的延迟回归：https://github.com/vllm-project/vllm/pull/39763

[4] TensorRT-LLM 回滚 Eagle3 动态树 speculative decoding 实现：https://github.com/NVIDIA/TensorRT-LLM/pull/13006

[5] Mooncake TENT 激活跨传输故障转移并添加安全上限与 Prometheus 指标：https://github.com/kvcache-ai/Mooncake/pull/1878

[6] Mooncake TENT RDMA EndPoint 改用 weak_ptr 消除悬垂指针风险：https://github.com/kvcache-ai/Mooncake/pull/1897

[7] Ray Serve 将 SGLang 引擎提升为正式 user guide，与 vLLM 并列：https://github.com/ray-project/ray/pull/62570

[8] LMCache 新增 per-request OTel 根 span 与 SpanRegistry，支持多级追踪：https://github.com/LMCache/LMCache/pull/3033

[9] llama.cpp 将 NCCL communicator 管理移入外部托管 context 对象：https://github.com/ggml-org/llama.cpp/pull/21891
