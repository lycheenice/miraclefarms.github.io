# 今日焦点：AI Infra 开始主动下线虚假优化路径

**📅 2026-04-17**

> 中文：清晨的数据中心机房里，多排 GPU 服务器与 NVMe 存储节点通过高速网络互联，监控大屏显示 tracing 瀑布图、缓存命中率与 SSD 延迟曲线，工程师在控制台清理失效路径与多租户隔离策略，无文字，16:9
>
> English: A modern AI datacenter at dawn with GPU servers and NVMe storage nodes connected by high-speed fabric, observability dashboards showing tracing waterfalls cache hit rates and SSD latency curves, engineers removing ineffective execution paths and tuning multi-tenant isolation, no text, 16:9

> 过去三天，AI Infra 最重要的变化不是新功能堆叠，而是项目开始主动裁掉无效复杂度，并把隔离与观测语义补进默认主干。

---

## 工具链

**TRL 弃用 `use_transformers_paged`[1]** - 这条路径原本打着更高效生成的旗号，但官方对 Qwen3-0.6B 的对比结果显示，它训练更慢，峰值显存还高出约 6 倍，因此现在只保留告警并准备后续彻底移除。这不是小清理，而是项目方公开承认“看起来高级”的路径如果不能在真实工作负载里成立，就不该继续占着默认位置。

**vLLM 按需初始化 SSU dispatch[2]** - 如果模型里根本没有 layer 会走这条 dispatch 路径，初始化阶段就直接跳过，不再为空转准备一套额外状态。前者是在清理错误的性能承诺，后者是在清理无意义的执行分支，这组变化说明框架竞争正在从“功能越多越好”转向“默认路径越干净越可信越好”。

---

## 生产部署侧

**LMCache 为 MP adapter 补入 `cache_salt`[3]**，又给 eviction policy 增加用户级驱逐扩展点[4] - 这意味着缓存系统开始正式朝多租户隔离和按用户配额治理推进，不再只把 L2 cache 当成所有请求共享的一口大池子，属于 **[持续更新]**。

**LMCache 同时补上 request root OTel span 与 SpanRegistry[5]** - lookup、retrieve、store 这些子阶段现在能挂到统一请求视图下面，团队还给了 Tempo、Grafana 的完整示例栈。换句话说，缓存层不只想“更快”，也开始要求“出了问题要能精确看到慢在哪”，属于 **[持续更新]**。

**Mooncake 修复跨机 SSD offload 的 RPC 绑定地址[6]** - 过去 standalone client 只绑定 `127.0.0.1`，远端客户端即便拿到元数据也会在 TCP 层直接吃 `ECONNREFUSED`。现在改成跟随 `FLAGS_host`，跨机 offload 才真正从单机演示变成可部署服务，属于 **[持续更新]**。

**Mooncake 继续补齐 SSD 指标与 eRDMA 稳定性[7][8]** - 一边把吞吐、IOPS 和 P50/P90/P99 latency 正式暴露出来，一边修掉字符串配置类型推断错误和 `numa_node = -1` 触发的越界崩溃。这组变化放在一起看，Mooncake 当前的重点已经不是再加一条传输路径，而是把现有 offload 数据面做成能部署、能观测、也不容易翻车的主线能力，属于 **[持续更新]**。

---

> 一句话结论：**AI Infra 正在进入“只保留真实有效默认路径”的阶段，隔离与观测语义开始和性能能力同等重要。**

---

## 参考

[1] TRL 弃用 use_transformers_paged，因其更慢且更耗显存：https://github.com/huggingface/trl/pull/5544

[2] vLLM 仅在存在调用层时初始化 SSU dispatch：https://github.com/vllm-project/vllm/pull/40039

[3] LMCache 为 MP adapter 接口引入 cache_salt 参数：https://github.com/LMCache/LMCache/pull/3029

[4] LMCache 为 EvictionPolicy 增加用户级驱逐扩展点与 cache_salt：https://github.com/LMCache/LMCache/pull/3032

[5] LMCache 为 MP server tracing 增加 per-request root OTel span 与 SpanRegistry：https://github.com/LMCache/LMCache/pull/3033

[6] Mooncake 修复 standalone client RPC 的 127.0.0.1 绑定，允许跨机 SSD offload：https://github.com/kvcache-ai/Mooncake/pull/1900

[7] Mooncake 为 SSD offload 增加吞吐、IOPS 与延迟指标：https://github.com/kvcache-ai/Mooncake/pull/1879

[8] Mooncake 修复 eRDMA 场景下的配置类型推断与负 NUMA 节点崩溃：https://github.com/kvcache-ai/Mooncake/pull/1894
