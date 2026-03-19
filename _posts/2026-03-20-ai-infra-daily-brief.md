---
layout: post
title: "投机采样进驻引擎主链路，KV 内存管理跨越抽象门槛"
date: 2026-03-20 05:00:00 +0800
author: 荔枝不耐思
categories: [AI Infra]
---
# 今日焦点：投机采样进驻引擎主链路，KV 内存管理跨越抽象门槛

**📅 2026-03-20**

> 引导语：过去 24 小时，最值得关注的信号是**投机采样在两大推理引擎中同步走向主链路**：vLLM ModelRunnerV2 补全了 rejection sampler 的 greedy 路径与 logprobs 支持，TensorRT-LLM 将投机解码接入 TrtllmGen 注意力后端，这不再是实验性功能，而是工程标配的节点信号。与此同时，KV 内存管理在多个层面升级：TRT-LLM 将约束式内存分区引入 KVCacheManagerV2，Mooncake 为对象存储层添加连接器抽象，LMCache 则推进非连续内存分配与 NIXL VRAM 段支持。训练侧出现了两个值得关注的方向：TRL 引入实验性 DPPO 算法，Megatron-LM 完成 RL 强制滞后机制。

---

## 推理侧

**vLLM ModelRunnerV2 投机解码 rejection sampler 补全 greedy 路径与 logprobs[[1]](https://github.com/vllm-project/vllm/pull/37238)[[2]](https://github.com/vllm-project/vllm/pull/37237)** — ModelRunnerV2 的投机解码此前对 greedy 采样路径支持不完整，logprobs 也缺失。这两个 PR 一并补上后，rejection sampler 在 MRV2 下的主要用例路径全面覆盖。投机解码从"只在特定条件可用"走向"主链路稳定支持"，是工程成熟度的关键节点。**[重要新功能]**

**TensorRT-LLM 在 TrtllmGen 注意力后端启用投机解码[[3]](https://github.com/NVIDIA/TensorRT-LLM/pull/12267)** — TrtllmGen 是 TRT-LLM 面向新架构的高性能注意力后端，此次将投机解码接入意味着该路径不再绕过 TrtllmGen 的性能优化。两大引擎在同一时间窗口落地投机解码主链路支持，是该技术工程化的明确信号。**[重要新功能]**

**vLLM 默认开启 Triton autotuning 磁盘缓存[[4]](https://github.com/vllm-project/vllm/pull/37188)** — Triton 算子在每次启动时重新调优的开销不可忽视，此前磁盘缓存需要手动开启。默认化后，生产部署的冷启动性能将得到系统性改善，尤其对频繁重启的容器化场景意义明显。**[重要性能优化]**

**SGLang 落地 CuteDSL mm_fp4 后端与 Expert Specialization Grouped GEMM[[5]](https://github.com/sgl-project/sglang/pull/18801)[[6]](https://github.com/sgl-project/sglang/pull/15471)** — CuteDSL mm_fp4 为 SGLang 引入 FP4 矩阵乘后端，与 NVFP4 路径并行扩充量化选项。Expert Specialization Grouped GEMM（sgl-kernel 系列第 6/7 步）则针对 MoE 模型中专家专化场景提供专用 GEMM，持续夯实 SGLang 的 MoE 推理内核栈。**[重要新功能]**

**SGLang 修复 DeepSeek-R1 在 DP 模式下的 GPU-fault 问题[[7]](https://github.com/sgl-project/sglang/pull/20841)** — 在启用数据并行（DP）时运行 DeepSeek-R1 会触发 GPU-fault，影响大规模部署的稳定性。该修复对在生产中使用 DP 模式跑 DeepSeek-R1 的用户影响直接。**[重要 bugfix]**

**llama.cpp 新增 Hexagon NPU HMX 后端与 WebGPU Qwen3.5 支持[[8]](https://github.com/ggml-org/llama.cpp/pull/20693)[[9]](https://github.com/ggml-org/llama.cpp/pull/20687)** — Hexagon Matrix Extensions（HMX）为高通 Hexagon NPU 提供矩阵加速算子，将 llama.cpp 的硬件覆盖延伸至移动端 NPU。WebGPU 侧同步补全 Qwen3.5 所需算子（TRI、DIAG、SET、GATED_DELTA_NET 等），两条线同步推进，端侧推理的硬件覆盖宽度持续扩张。**[重要新功能]**

---

## 训练侧

**TRL 引入实验性 Divergence Proximal Policy Optimization（DPPO）[[10]](https://github.com/huggingface/trl/pull/5117)** — DPPO 在 PPO 基础上引入散度约束，旨在控制策略更新幅度、提升 RLHF 训练稳定性。以实验性标记合并意味着 TRL 正在积极拓宽 RL 算法覆盖，给研究者提供更多开箱即用的基线选择。**[重要新功能]**

**TRL GRPO 修复 tool-calling 循环中的 re-tokenization bug[[11]](https://github.com/huggingface/trl/pull/5242)** — 在含工具调用的 GRPO 训练循环中，re-tokenization 使用字符串拼接而非 token ID 拼接，导致 tokenizer 边界不对齐，可能产生静默的训练数据错误。修复后改为直接拼接 token IDs，正确性得到保证。**[重要 bugfix]**

**Megatron-LM 新增新兴优化器支持[[12]](https://github.com/NVIDIA/Megatron-LM/pull/3907)** — 扩充了可用优化器列表，覆盖近期在大模型训练中表现出色的算法变体。对需要尝试新优化器的研究团队而言，无需自行集成即可在 Megatron 框架内直接使用。**[重要新功能]**

**Megatron-LM 实现 RL 强制滞后（forced lag）机制[[13]](https://github.com/NVIDIA/Megatron-LM/pull/3517)** — 在强化学习训练中，策略更新与价值函数更新之间的时序对齐是影响训练稳定性的关键因素。forced lag 机制通过显式控制更新滞后量来规避梯度估计偏差，是 Megatron-LM RL 训练路径走向生产级的重要补全。**[重要新功能]**

---

## 生产部署侧

**TensorRT-LLM 将约束式内存分区引入 KVCacheManagerV2[[14]](https://github.com/NVIDIA/TensorRT-LLM/pull/12212)** — KVCacheManagerV2 获得基于约束的内存分区能力，可按策略将 KV cache 内存划分为独立区域，为多租户场景下的资源隔离和 SLA 保障提供基础能力。此为 KV cache 管理架构的重要演进。**[重要新功能]**

**Mooncake Store 层新增 OSS、HuggingFace、Redis 连接器抽象[[15]](https://github.com/kvcache-ai/Mooncake/pull/1707)** — 将底层存储后端统一抽象为 Connector 接口，OSS（对象存储）、HuggingFace Hub 和 Redis 均可作为 KV cache 持久化或分发后端接入。这一抽象使 Mooncake 的 KV 存储能力从特定后端解耦，为多云和混合存储场景打开空间。**[重要新功能]**

**LMCache 支持非连续内存分配与 NIXL OBJ 插件 VRAM_SEG[[16]](https://github.com/LMCache/LMCache/pull/2767)[[17]](https://github.com/LMCache/LMCache/pull/2640)** — MemoryAllocator 新增非连续内存块分配支持，允许在物理内存碎片化场景下仍能有效利用 VRAM。VRAM_SEG 支持进一步完善了 LMCache 与 NIXL 传输层的集成，提升 GPU 内存的利用灵活性。**[重要新功能]**

**LMCache 将全局传输锁改为 per-device 级别以消除死锁[[18]](https://github.com/LMCache/LMCache/pull/2816)** — 原全局 transfer_lock 在多设备并发传输场景下会导致死锁。改为 per-device lock 后，各设备的 KV cache 传输路径相互独立，解除了并发瓶颈，同时避免了因锁粒度过粗导致的可用性问题。**[重要 bugfix]**

---

## 应用侧

**llama.cpp server 成为采样参数默认值的唯一来源[[19]](https://github.com/ggml-org/llama.cpp/pull/20558)** — 此前 server 与底层 common 库对采样参数默认值存在分散定义，导致不同调用路径行为不一致。统一后 server 成为 source of truth，简化了参数优先级推理，减少用户困惑。**[重要 bugfix]**

**llama.cpp server 新增 router 死锁修复与 oaicompat 响应 cached_tokens 字段[[20]](https://github.com/ggml-org/llama.cpp/pull/20763)[[21]](https://github.com/ggml-org/llama.cpp/pull/19361)** — router 模式下子进程崩溃或 models_max 的 TOCTOU 竞态会导致 server 死锁，影响多模型路由场景的可用性。oaicompat 响应补充 cached_tokens 字段使前端可观测提示缓存命中情况，对成本优化有实用价值。**[重要 bugfix]**

**OpenClaw CLI 自动清理失效 gateway 认证凭据[[22]](https://github.com/openclaw/openclaw/pull/50639)** — 切换模式时自动剔除已不活跃的 gateway auth credentials，减少凭据管理的手动干预，同时降低泄露面。**[重要安全修复]**

---

## 结语

今天的两条主线相互呼应：**投机采样在主流推理引擎中走向标配，KV 内存管理在多个项目中同步升级抽象层次**。前者说明业界对投机解码提升吞吐的共识已转化为工程行动——vLLM 补全主链路、TRT-LLM 打通高性能后端，这类"同窗合并"不是巧合，而是技术成熟度时钟在跑。后者则是一种更安静但同样重要的信号：KV cache 不再只是"一块显存"，TRT-LLM 的约束式分区、Mooncake 的连接器抽象、LMCache 的非连续分配，都在把它变成有接口、有策略、可扩展的基础设施组件。训练侧 TRL 的 DPPO 和 Megatron-LM 的 RL forced lag，则提示 post-training 的算法库正在系统性扩容——框架已不满足只支持 PPO 和 GRPO，正在把更多研究成果变成工程选项。

---

---

## 参考文献

[1] [vLLM MRV2 rejection sampler greedy 支持](https://github.com/vllm-project/vllm/pull/37238)

[2] [vLLM MRV2 rejection sampler logprobs 支持](https://github.com/vllm-project/vllm/pull/37237)

[3] [TensorRT-LLM TrtllmGen 后端投机解码](https://github.com/NVIDIA/TensorRT-LLM/pull/12267)

[4] [vLLM Triton autotuning 磁盘缓存默认开启](https://github.com/vllm-project/vllm/pull/37188)

[5] [SGLang CuteDSL mm_fp4 后端](https://github.com/sgl-project/sglang/pull/18801)

[6] [SGLang Expert Specialization Grouped GEMM](https://github.com/sgl-project/sglang/pull/15471)

[7] [SGLang DeepSeek-R1 DP GPU-fault 修复](https://github.com/sgl-project/sglang/pull/20841)

[8] [llama.cpp Hexagon HMX NPU 后端](https://github.com/ggml-org/llama.cpp/pull/20693)

[9] [llama.cpp WebGPU Qwen3.5 算子支持](https://github.com/ggml-org/llama.cpp/pull/20687)

[10] [TRL Divergence PPO 实验性实现](https://github.com/huggingface/trl/pull/5117)

[11] [TRL GRPO tool-calling re-tokenization 修复](https://github.com/huggingface/trl/pull/5242)

[12] [Megatron-LM 新增新兴优化器](https://github.com/NVIDIA/Megatron-LM/pull/3907)

[13] [Megatron-LM RL forced lag 实现](https://github.com/NVIDIA/Megatron-LM/pull/3517)

[14] [TensorRT-LLM KVCacheManagerV2 约束式内存分区](https://github.com/NVIDIA/TensorRT-LLM/pull/12212)

[15] [Mooncake Store 连接器抽象（OSS/HF/Redis）](https://github.com/kvcache-ai/Mooncake/pull/1707)

[16] [LMCache 非连续内存分配支持](https://github.com/LMCache/LMCache/pull/2767)

[17] [LMCache NIXL OBJ VRAM_SEG 支持](https://github.com/LMCache/LMCache/pull/2640)

[18] [LMCache per-device transfer_lock 死锁修复](https://github.com/LMCache/LMCache/pull/2816)

[19] [llama.cpp server 采样参数 source of truth 统一](https://github.com/ggml-org/llama.cpp/pull/20558)

[20] [llama.cpp server router 死锁修复](https://github.com/ggml-org/llama.cpp/pull/20763)

[21] [llama.cpp oaicompat cached_tokens 字段](https://github.com/ggml-org/llama.cpp/pull/19361)

[22] [OpenClaw CLI 失效凭据自动清理](https://github.com/openclaw/openclaw/pull/50639)
