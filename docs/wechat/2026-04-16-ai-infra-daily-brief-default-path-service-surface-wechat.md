---
published: true
wechat_published: true
---
# AI Infra 早报｜默认路径优化开始吞并服务面工程

**日期：2026-04-16**

过去三天，AI Infra 这波更新最值得记住的，不是哪一个项目又多了一个新特性，而是越来越多框架开始把性能优化、服务指标和数据面能力一起收进默认生产路径。系统团队正在把“你需要自己手调的部分”一点点吃回框架内部。

更直接地说，竞争点正在变化。下一轮比的不是功能面板有多长，而是默认配置下能不能更快、更稳，也更容易被运维团队看见和接住。

## 一、默认路径正在接管手工调优

SGLang 把多 GPU diffusion 的默认并行策略从纯 sequence parallel 切到 CFG parallel[1]。这一步很重要，因为它不再把“用户要不要自己选并行模式”当成前提，而是只要你用两张以上 GPU 启动、又没显式指定并行参数，就直接替你启用更优路径。官方给出的 H200 双卡数据里，Qwen-Image 1024x1024 场景从 11.21 秒降到 7.14 秒，Wan-1.3B T2V 从 5.95 秒降到 4.77 秒，已经足以说明这不是边角优化。

vLLM 也在做同一件事。一边，它为 Qwen3-VL 视频推理补上了 ViT full CUDA graph 正式支持[2]，把图像编码器上的图捕获思路继续推到视频路径；另一边，它又把 pooling entrypoints 的阻塞前后处理下放到线程池[3]，直接去消化 async tokenizer 引入的约 2ms 延迟回归和高并发波动。合在一起看，默认路径的优化范围已经从 kernel 扩展到了整个 serving surface。

## 二、服务系统开始补齐“看得见”和“不卡死”

TensorRT-LLM 这几天最值得关注的，不只是性能项，而是服务面工程。它新增了一批生产级 Prometheus 指标[4]，把 iteration stats、token counters、prefill/decode/inference 时延和配置项一起暴露出来。这意味着框架开始主动把“系统现在怎么跑”变成可以被线上抓取和诊断的信号，而不再停留在开发者本地看日志。

同时，TensorRT-LLM 还修了 benchmark disaggregated serving 模式里的死锁问题[5]。核心思路是拿掉阻塞式 fill loop，让 executor 在等待批次凑满时，仍然能处理 KV transfer、timeout 和错误状态。这个修复很像一个阶段切换信号：disaggregated serving 现在更在乎能不能长期稳定跑，而不是只在 demo 条件下跑起来。

## 三、缓存与传输底座继续向异构硬件外扩

Mooncake 这几天的三条更新可以一起看。它先是在 Python `setup()` 接口里直接支持 SSD offload[6]，让 embedded RealClient 模式可以在 `enable_offload=True` 时自动拉起内部 RPC server；接着又给 Python 包补上了 ROCm HIP transport[7]，把 AMD GPU 路径真正打通；然后又在 Kunpeng 平台上推进 UB Transport 第二阶段[8]，把 mock、测试和构建集成往前补齐。

这些更新的共同点，是 Mooncake 并不是只想做一个“远端 KV cache 组件”，而是在把分层存储、异构硬件和统一传输接口逐步压进同一套底座。只要这条路线继续推进，缓存和传输层就会越来越像基础设施抽象，而不是每个项目各写一套。

## 今天真正值得记住的判断

这波更新真正说明的是，AI Infra 正在进入“默认路径竞争期”。并行策略、CUDA graph、线程模型、Prometheus 指标、deadlock recovery、SSD offload、异构 transport，这些过去分散在不同层的能力，现在开始被一起推进到默认生产面。

谁先把这些能力做成默认配置，而不是文档里的高级选项，谁就更有机会在下一轮生产部署里占上风。

## 参考资料

[1] SGLang 为多 GPU diffusion 默认启用 CFG parallel（GitHub PR：https://github.com/sgl-project/sglang/pull/22763）

[2] vLLM 为 Qwen3-VL 视频推理支持 ViT full CUDA graph（GitHub PR：https://github.com/vllm-project/vllm/pull/38061）

[3] vLLM 将 pooling entrypoints 的阻塞前后处理下放到线程池（GitHub PR：https://github.com/vllm-project/vllm/pull/39763）

[4] TensorRT-LLM 增加生产级 Prometheus 指标（GitHub PR：https://github.com/NVIDIA/TensorRT-LLM/pull/12545）

[5] TensorRT-LLM 修复 benchmark disaggregated serving 死锁（GitHub PR：https://github.com/NVIDIA/TensorRT-LLM/pull/12208）

[6] Mooncake 在 Python setup 接口中支持 SSD offload（GitHub PR：https://github.com/kvcache-ai/Mooncake/pull/1857）

[7] Mooncake Python 包增加 ROCm HIP transport 支持（GitHub PR：https://github.com/kvcache-ai/Mooncake/pull/1742）

[8] Mooncake 在 Kunpeng 平台推进 UB Transport 第二阶段（GitHub PR：https://github.com/kvcache-ai/Mooncake/pull/1855）
