---
title: "RollArt：Agentic RL 的系统竞争，正在从资源拼装转向执行路径重构"
date: 2026-04-03 20:25:00 +0800
author: Ethan
kind: essay
category: Essay
intro: 阿里与港科大的 RollArt 论文把 Agentic RL 训练重新定义为一个异构、多阶段、长尾敏感的系统问题。文章拆解其三条核心设计原则：硬件亲和映射、轨迹级异步执行与状态感知部署，并讨论这些机制为何能把 Agentic RL 从“资源堆叠”推进到“关键执行路径优化”。
---

# RollArt：Agentic RL 的系统竞争，正在从资源拼装转向执行路径重构

论文标题：**RollArt: Scaling Agentic RL Training via Disaggregated Infrastructure**  
论文链接：<https://arxiv.org/html/2512.22560v1>

---

## 一、为什么 RollArt 值得看

过去一年，Agentic RL 的讨论很多集中在算法层：reward 设计、GRPO、长轨迹训练、环境设计、评测基准扩展。但当这类训练真正跑到中大规模集群上之后，系统矛盾会迅速浮到台前。

问题并不难理解。一个 Agentic RL 训练 step，往往同时包含四类完全不同的执行行为：

- 模型在 rollout 里进行 prefill 与 decode
- 环境在外部执行 step / reset
- reward worker 对轨迹进行评价
- training worker 消化带奖励的样本并同步新权重

这四类行为共享同一个训练闭环，却不共享同一种资源偏好，也不共享同一种延迟分布。RollArt 这篇论文的重要性，就在于它把这些矛盾收束成一个清晰判断：**Agentic RL 的系统瓶颈，越来越取决于不同阶段能否沿着关键执行路径被高效拼接，而不只是单阶段是否足够快。**

论文摘要里的第一句关键信息是：

> “Agentic RL workloads are highly heterogeneous, combining compute-intensive prefill phases, bandwidth-bound decoding, and stateful, CPU-heavy environment simulations.”  
> —— Abstract

紧接着，作者给出了系统层的核心方案：

> “We present RollArt, a distributed system designed to maximize throughput for multi-task agentic RL on disaggregated infrastructure.”  
> —— Abstract

以及三条总原则：

> “RollArt is built on three core principles: (1) hardware-affinity workload mapping, (2) fine-grained asynchrony, and (3) statefulness-aware computation.”  
> —— Abstract

如果把这三条原则翻译成更工程化的话，它们分别是在回答三个问题：

1. **不同 rollout 该落到什么硬件上**
2. **哪些等待可以被隐藏在别的执行阶段后面**
3. **哪些组件应该常驻，哪些组件应该服务化**

这篇文章会沿着这个逻辑拆解 RollArt 的系统设计，并讨论它到底证明了什么。

---

## 二、RollArt 试图解决的到底是什么问题

论文在引言中先把训练闭环界定得很清楚：

> “The agentic RL training pipeline operates as an iterative cycle comprising three stages: rollout, reward, and training.”  
> —— Section 1

这一定义看似简单，但它给系统设计划出了一条很明确的边界：RollArt 讨论的不是单一推理系统，也不是单一训练系统，而是一个多阶段协同系统。

### 1. rollout 内部就已经是异构负载

论文强调，rollout 阶段并不能被简单看作“推理阶段”。不同任务会把系统推向不同瓶颈：

> “long-horizon tasks like FrozenLake or SWE-bench are prefill-heavy, whereas short-turn tasks like GEM-math / GEM-game are decoding-dominant.”  
> —— Section 1

这意味着 rollout 内部就已经包含不同的关键路径：

- 长交互、多轮上下文累积的任务更偏 **prefill-heavy**
- 短轮次、长输出链路的任务更偏 **decoding-heavy**

如果系统把所有 rollout 请求等价处理，资源错配几乎不可避免。

### 2. environment 的状态性会把长尾拉进训练主路径

RollArt 还明确点出 environment 的状态和部署特征：

> “These environments are often stateful, CPU-bound simulations that introduce severe resource contention if colocated on GPU nodes.”  
> —— Section 1

这段话的含义很重。对于 SWE-bench、browser-based agent、tool-use environment 这类场景，环境已经不是一个轻量函数调用，而是持久会话、容器、浏览器或代码沙箱。这样一来，延迟抖动、失败重试、资源争用和外部依赖都会进入训练主路径。

### 3. reward 与 training 也不是一类资源曲线

reward 计算通常更具脉冲性，而 training 需要稳定、连续、高带宽的 GPU 资源。把两者放进同一种资源池，系统容易在局部空闲与全局拥堵之间来回切换。

正因如此，论文才会进一步提出：

> “We argue that efficient agentic RL training requires disaggregated infrastructure to leverage specialized, best-fit hardware.”  
> —— Abstract

这就是 RollArt 的出发点：**任务结构决定执行路径，执行路径决定基础设施形态。**

---

## 三、为什么“把资源拆开”还不够

看到这里，一个很自然的想法是：那就把 rollout、reward、training 拆到不同资源池上。

论文的回答是，这样做方向没错，但还远远不够。作者在摘要中马上补了一句：

> “However, naive disaggregation introduces substantial synchronization overhead and resource underutilization due to the complex dependencies between stages.”  
> —— Abstract

也就是说，资源解耦本身会带来新的等待链条。最典型的两个来源是：

1. rollout 等待最新权重
2. training 等待 rollout 收齐轨迹

这也是为什么论文会单独拿出同步与异步训练做对比。

![Figure 2](https://arxiv.org/html/2512.22560v1/x13.png)

> “Figure 2: Synchronous vs. asynchronous training.”  
> —— Figure 2

在同步设置里，最关键的限制是：

> “In synchronous RL training, the rollout stage can only proceed after the latest agent LLM weights have been synchronized.”  
> —— Section 3.2

而且：

> “This weight synchronization is the dominant source of inter-stage communication overhead.”  
> —— Section 3.2

这两句话合起来，给出了 RollArt 的第二层问题定义：**系统的主要损耗，不只来自阶段内计算慢，还来自阶段之间的同步点太多。**

因此，RollArt 并没有把“解耦基础设施”当成结论，而是把它当成前提。真正决定效率上限的，是这些被解耦出来的阶段，能否沿着关键路径实现高质量协同。

---

## 四、原则一：硬件亲和映射，把 rollout 内部也继续拆开

RollArt 的第一条原则，是很多读者最容易低估、但其实最有现实意义的一条：

> “Our first principle is to map workloads to resources based on their hardware affinity...”  
> —— Section 4.1

这里最重要的细节，不是“按阶段选硬件”，而是它把粒度进一步下沉到了 trajectory：

> “Users are allowed to define a collection of hardware types at the granularity of both stages and individual trajectories.”  
> —— Section 4.1

作者接着写道：

> “within the rollout stage, trajectories whose generation is dominated by prefill and does not hit memory limits can be routed to H800 GPUs, whereas trajectories dominated by decoding can be scheduled on H20 GPUs.”  
> —— Section 4.1

这段设计背后的系统判断其实很明确：**rollout 并不是一个统一阶段，而是一组对硬件偏好不同的请求集合。**

如果把所有 rollout 都放在 H800 上，decode-heavy 任务会用不到那部分峰值算力；如果全部放在 H20 上，prefill-heavy 任务又会吃不到足够的算力密度。RollArt 的做法，是让两类轨迹分别去更合适的池子。

![Figure 11](https://arxiv.org/html/2512.22560v1/x20.png)

> “Figure 11: [Principle 1]: (a) The efficiency of hardware affinity; (b) The benefit of async cross-cluster communication.”  
> —— Figure 11

实验部分的结果也很直接：

> “RollArt achieves a 1.30–1.68× step time speedup across LLM sizes compared to H20-only configuration and 1.12-1.37 speedup compared to H800-only configuration...”  
> —— Section 7.3

并且：

> “The H20-only configuration performs worst, suggesting that many agentic tasks benefit more from compute-optimized GPUs due to frequent prefill operations.”  
> —— Section 7.3

这个结果支持一个很明确的工程结论：**在 Agentic RL 里，硬件映射的价值不是粗粒度“训练卡 / 推理卡”分工，而是把 rollout 内部的关键路径再细分一层。**

当然，这条原则的收益有边界。它依赖系统能够识别 trajectory 的负载特征，也依赖异构资源池可用。如果任务组成很单一，或集群只有一种 GPU，那么映射空间会明显收缩。

---

## 五、原则二：把异步设计下沉到 trajectory 生命周期

RollArt 的第二条原则是全文最核心的设计之一：

> “Within rollout, this principle advocates operating at the trajectory level rather than the batch level.”  
> —— Section 1 / Section 4.2

这条原则瞄准的是 environment 的尾部延迟。论文在 3.1 节已经给出了一个很明确的判断：

> “the system must abandon batched environment interaction in favor of fine-grained, asynchronous environment management.”  
> —— Section 3.1

其依据是：

> “batched environment interaction increases rollout time by up to 21.3% compared to ideal execution”  
> —— Section 3.1

也就是说，在 Agentic RL 场景下，batch-level env execution 会把少量慢环境的长尾扩散到整批请求上。

### 1. LLMProxy：推理引擎持续忙，单条轨迹可增删

在实现层，RollArt 首先引入了 LLMProxy：

> “LLMProxy is a gateway that decouples LLM serving clients from the underlying serving instances.”  
> —— Section 5.3

它的关键设计不是简单做一个中转层，而是在推理引擎与外部请求之间加入更细粒度的控制。论文写道：

> “This design ensures that adding or aborting an ongoing trajectory does not stall the entire LLM generation process.”  
> —— Section 5.3

也就是说，系统可以在保持批处理吞吐的同时，允许单条 trajectory 动态加入、取消、提前结束。

### 2. EnvManager：环境以单轨迹为单位推进

另一侧的组件是 EnvManager：

> “Each EnvManager is a lightweight controller that manages the lifecycle of a single environment to collect trajectories.”  
> —— Section 5.3

并且：

> “each EnvManager yields a single trajectory rather than batch-executing environment interactions”  
> —— Section 5.3

这使得环境执行从“等一批请求一起推进”转成“每条 trajectory 独立推进”。于是：

> “long-tail environment workers do not delay the execution of other workers.”  
> —— Section 5.3

![Figure 7](https://arxiv.org/html/2512.22560v1/x15.png)

> “Figure 7: Trajectory-Level Rollout Overview.”  
> —— Figure 7

### 3. 为什么这件事重要

trajectory-level orchestration 解决的，其实是 Agentic RL 最顽固的一类损耗：**尾部等待扩散**。环境只要有长尾，batch 级别 barrier 就会不断把局部慢请求扩散成系统级空泡。

实验结果非常符合这一逻辑：

> “As the latency variance increases, the performance gains of trajectory-level over batch-level interaction grows from 1.23× to 2.27×”  
> —— Section 7.4

另外，RollArt 还加入了冗余 rollout 机制：

> “This technique allows users to launch more environments than strictly required...”  
> —— Section 5.3

并报告：

> “The maximum speedup reaches 1.62×”  
> —— Section 7.4

这说明 RollArt 的异步不是“并行地做更多事”这么简单，而是通过 trajectory 粒度调度，重写了系统如何处理长尾、失败和冗余。

---

## 六、原则三：按状态性划分部署边界，让 reward 脱离常驻资源池

RollArt 的第三条原则关注组件的状态性：

> “A stateless system component’s output depends solely on its input, rendering each execution independent and thus ideal for optimization on a serverless platform.”  
> —— Section 4.3

在 rollout、reward、training 三个阶段中，作者把 reward 识别为最适合服务化部署的对象。论文的原话是：

> “A reward worker takes a trajectory as input and produces a scalar value without retaining any memory of past evaluations.”  
> —— Section 4.3

因此：

> “This property makes it well suited to a serverless computation model, enabling shared, multi-tenant Reward-as-a-Service that can scale elastically to and from zero, thereby maximizing resource utilization.”  
> —— Section 4.3

这个判断并不是拍脑袋得出的。论文在 workload characterization 阶段已经测到：

> “the reward GPUs achieve only 7.4% average utilization across steps”  
> —— Section 3.1

如果 reward 继续绑在本地专属 GPU 上，资源浪费会非常明显。

![Figure 14](https://arxiv.org/html/2512.22560v1/x22.png)

> “Figure 14: [Principle 3]: Comparison between dedicating local GPUs and using Reward-as-a-Service.”  
> —— Figure 14

实验结果表明：

> “The serverless platform is shared by three jobs and perform autoscaling, increasing average GPU utilization from 6% to 88%.”  
> —— Section 7.5

并且：

> “the average rollout time reduces from 158 seconds to 77 seconds”  
> —— Section 7.5

这说明 reward 服务化带来的收益并不只是“省卡”，而是会沿着 rollout 的关键路径继续传导，缩短端到端完成时间。

从系统设计的角度看，RollArt 在这里给出了一条很有价值的判据：**部署边界应当由 statefulness 决定，而不是由组件名称决定。**

---

## 七、跨集群权重同步：如果通信仍然同步，前面的优化会被抵消

硬件亲和映射会把 rollout 和 training 放到不同集群，这就不可避免地引入跨集群权重同步。论文明确写道：

> “This weight synchronization is the dominant source of inter-stage communication overhead.”  
> —— Section 3.2

为了解决这个问题，RollArt 在通信层也做了异步化：

> “RollArt addresses this by implementing an asynchronous weight update engine using Mooncake.”  
> —— Section 5.2

具体方式是：

> “training workers ... asynchronously publish weights ... while inference workers ... can fetch them on-demand.”  
> —— Section 5.2

这个设计的关键不在于完全消灭通信，而在于让通信尽量从主路径上移开。实验也给出了对应收益：

> “The asynchronous communication technique achieves a 1.10-1.16× reduction in end-to-end step time across LLMs”  
> —— Section 7.3

如果没有这一步，前面依靠硬件亲和和轨迹级异步拿到的收益，会有一部分被同步权重更新重新吃掉。换句话说，RollArt 的异步设计并不是只覆盖执行层，还覆盖了通信层。

---

## 八、RollArt 最终证明了什么

论文最容易被传播的结果，是端到端加速比：

> “with a bound of 1, the asynchronous approach delivers a 2.05× and 1.35× step time reduction over the veRL+ and StreamRL.”  
> —— Section 7.2

吞吐方面：

> “RollArt can provide 2.65-4.58× throughput over the Sync baseline.”  
> —— Section 7.2

扩展性方面：

> “the asynchronous RL training in RollArt continues to yield 1.33-2.08× throughput improvements”  
> —— Section 7.2

但如果只盯着这些数字，容易看漏这篇论文真正证明的东西。

RollArt 证明的并不是“再加几个异步开关，训练就更快了”，而是：**当 Agentic RL 成为多阶段异构流水线时，系统优化的有效单位已经从单阶段性能，转向跨阶段关键执行路径。**

这也是为什么论文的三条原则能形成闭环：

- 硬件亲和映射解决资源错配
- trajectory-level async 解决环境长尾
- statefulness-aware deployment 解决低利用率常驻资源
- 异步权重同步解决跨集群阶段等待

论文在生产场景中的验证也强化了这一点：

> “Over the past six months, thousands of agentic RL jobs have used RollArt for post-training.”  
> —— Section 8

以及：

> “This design has proven highly robust, with only a single failure observed during a week-long training run.”  
> —— Section 8

这让 RollArt 从“系统研究原型”更接近“生产训练基础设施”的范畴。

---

## 九、RollArt 的边界在哪里

这篇论文很强，但结论仍然有适用范围。

### 1. 它最适合多任务、异构环境明显的 Agentic RL

如果任务结构很单一，环境抖动很小，reward 也非常轻量，那么 RollArt 的完整体系未必能体现同样幅度的收益。

### 2. 它依赖较强的平台能力

异构 GPU 池、CPU 环境集群、serverless reward 平台、跨集群权重同步能力，这些都意味着较高的 infra 门槛。原则本身有可迁移性，但实现难度并不低。

### 3. 异步窗口仍然受训练稳定性约束

论文也明确承认：

> “The staleness introduces high variance and compromise training stability.”  
> —— Section 5.3

因此作者给出的更实际结论是：

> “Our empirical study (§ 7.2) suggests that setting the asynchronous bound to one yields a balance between training speed and stability.”  
> —— Section 5.3

这意味着，RollArt 并没有把异步推进到无限大，而是在吞吐和稳定性之间找到了一个经验最优区间。

---

## 结语

RollArt 之所以值得认真读，不是因为它给出了一个新框架名，而是因为它对 Agentic RL 的系统问题做了一次很扎实的重述。

当模型训练进入与环境持续交互的阶段，系统瓶颈已经越来越少地来自单一模块算得够不够快，越来越多地来自不同阶段如何共享资源、如何减少尾部阻塞、如何把等待从主路径上挪开。RollArt 用解耦基础设施、轨迹级异步和状态感知部署，把这件事讲清楚了。

论文在结尾写道：

> “In this paper, we design an efficient and scalable disaggregated RL training system.”  
> 
> “Our microbenchmarks and macrobenchmarks demonstrate that RollArt delivers substantial improvements in resource efficiency, scalability, and system resilience in production-level clusters.”  
> —— Conclusion

我对这篇论文的总体判断是：**它给 Agentic RL 提供了一套更接近下一阶段现实需求的系统方法论。** 对于任何正在思考 agent training infra 的团队来说，RollArt 都值得被当成一个系统设计参照系，而不只是一个 benchmark 上更快的实现。

---

## 参考来源

1. Wei Gao, Yuheng Zhao, Tianyuan Wu, et al. **RollArt: Scaling Agentic RL Training via Disaggregated Infrastructure**. arXiv, 2025.  
   <https://arxiv.org/html/2512.22560v1>
2. 本文引用的关键章节包括：Abstract，Section 1，Section 2.1，Section 3.1，Section 3.2，Section 4.1，Section 4.2，Section 4.3，Section 5.2，Section 5.3，Section 7.2，Section 7.3，Section 7.4，Section 7.5，Section 8，Conclusion。
