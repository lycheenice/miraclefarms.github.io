---
published: true
wechat_published: true
---
# AI Infra 早报｜MoE 与 KV 数据面开始为真实生产负载补课

**日期：2026-04-15**

过去三天，AI Infra 更值得关注的变化，不是又多了一个 headline feature，而是几个核心项目开始系统拆掉“理想假设”。MoE 内核不再只服务于对齐得刚刚好的 hidden dim，router 不再满足于旧精度路径勉强可用，shared expert overlap 也开始面向更复杂的 dispatcher 条件收敛。另一边，KV cache 相关项目同步在补另一类短板：offload 布局、主从恢复、生命周期观测和 eviction 语义，正在从“能跑通”走向“在真实生产场景下也能接住问题”。

今天真正值得记住的判断是：推理框架和 KV 基础设施正在一起为“真实工作负载”补课。前一阶段大家更关心新 kernel、新并行策略和新缓存层能不能跑出 benchmark；现在更关键的问题变成了，当模型形状不完美、路由精度更敏感、节点会重启、缓存 key 会被锁住时，系统还能不能继续稳定工作。

## 一、MoE 路径开始摆脱“理想形状”前提

vLLM 最近一条很关键的更新，是为 TRTLLM GEN NVFP4 MoE 内核补上了非 512 对齐 hidden dim 支持[1]。它没有放弃现有高性能内核，而是在加载时对权重补零，把原本只适合理想对齐条件的路径扩到更多真实模型形状。这个动作的价值不只是“兼容更多模型”，更重要的是它把 benchmark 友好的能力往真实线上模型分布推进了一步。官方给出的 Nemotron-3-Nano-30B-A3B-NVFP4 数据里，请求吞吐提升约 22%，输出 token 吞吐提升约 22%，P99 TTFT 下降超过 33%。

Megatron-LM 的动作则更偏系统调度侧。它把 shared expert overlap 正式扩到了 FlexDispatcher[2]，同时补上了在 `CUDA_DEVICE_MAX_CONNECTIONS > 1` 情况下的 stream wait，避免 shared expert GEMM 提前启动。换句话说，Megatron 正在把 overlap 从“特定条件下成立的优化”变成“不同执行条件下也能安全使用的路径”。

同一主线还体现在 router 本身。Megatron-LM 为 MoE router 增加了新的 `sqrtsoftplus` score function，并把 routing 中间计算统一收回 FP32，只在返回时再转回原 dtype[3]。这看起来像小范围调参，实质上却是在承认 router 精度本身已经是产线问题。MoE 一旦走进大规模部署，route score 的数值稳定性、aux loss 计算和 top-k 选择，都会直接影响吞吐和质量能不能同时守住。

## 二、KV 数据面正在从“搬运数据”转向“管理生命周期”

vLLM 这几天另一个值得注意的动作，是为 offloading workers 引入统一的 mmap 共享内存布局[4]。过去每个 TP worker 各自持有一块 pinned CPU buffer，现在则改成所有 worker 共享同一份物理内存页，并按 interleaved block 方式组织。它带来的关键变化是：offloaded KV block 不再只能在原来的 TP 配置里被理解和重建，跨实例、跨并行度迁移开始有了更扎实的基础。KV offload 到这个阶段，讨论的已经不是“CPU 能不能兜底显存压力”，而是这些块能否成为可迁移、可共享的数据资产。

Mooncake 则把主节点崩溃后的恢复逻辑正式做成了 client-based HA recovery[5]。它没有停留在“Master 重启后客户端重新上报 metadata”这种粗糙方案，而是补了一个明确的状态机和三阶段恢复流水线，先回放 hot keys，再补 DRAM entries，最后同步 storage tier，同时用双优先级队列把正常流量和 recovery 流量分开处理。这说明 KV 系统已经进入必须认真面对故障恢复排序、锁竞争和回放优先级的阶段。

LMCache 最近三天的两条更新也很有代表性。一条是新增 L0 subscriber，用来追踪 GPU KV cache block 的生命周期、空闲时间和复用间隔[6]；另一条是修掉 LRU eviction 里“命中锁住 key 仍硬删”的低效路径，开始跳过 locked keys 再选择驱逐对象[7]。这两条放在一起看很清楚：缓存系统的成熟度，不只看命中率和带宽，也看你是否知道 block 为什么留下、为什么被逐出，以及逐出时会不会因为锁语义失效而浪费一次 eviction 机会。

## 今天真正值得记住的判断

这几条更新连起来看，AI Infra 正在进入一个更不讨巧、但也更关键的阶段。系统团队不再只追求“再快一点”的 headline，而是开始清理那些只在理想条件下才成立的默认假设：hidden dim 必须整齐，dispatcher 行为必须单一，Master 不会掉线，缓存 key 大多可直接回收，offload block 只会在当前 TP 配置里被读写。

这类补课通常不如新 feature 显眼，却更决定一个项目能否成为长期基础设施。下一轮竞争未必是谁先发明新算法，而更可能是谁更早把这些真实生产约束吃进主路径，并把它们做成默认可用、默认可观测、默认可恢复的能力。

## 参考来源

[1] vLLM 为 TRTLLM GEN NVFP4 MoE 内核补上非 512 对齐 hidden dim 支持（GitHub PR：https://github.com/vllm-project/vllm/pull/39510）

[2] Megatron-LM 为 FlexDispatcher 支持 shared expert overlap（GitHub PR：https://github.com/NVIDIA/Megatron-LM/pull/2207）

[3] Megatron-LM 为 MoE router 增加 sqrtsoftplus 并统一 FP32 中间计算（GitHub PR：https://github.com/NVIDIA/Megatron-LM/pull/3673）

[4] vLLM 为 offloading workers 引入统一 mmap 共享内存布局（GitHub PR：https://github.com/vllm-project/vllm/pull/37206）

[5] Mooncake 实现基于客户端的 Master HA recovery（GitHub PR：https://github.com/kvcache-ai/Mooncake/pull/1876）

[6] LMCache 新增 L0 subscriber 追踪 GPU KV cache 生命周期（GitHub PR：https://github.com/LMCache/LMCache/pull/2974）

[7] LMCache 在 LRU eviction 中跳过 locked keys 以提升驱逐效率（GitHub PR：https://github.com/LMCache/LMCache/pull/2978）
