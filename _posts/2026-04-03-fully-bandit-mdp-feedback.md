---
title: "在只看总分时学习 MDP：从 fully bandit feedback 重新理解弱反馈强化学习"
date: 2026-04-03 20:30:00 +0800
author: Ethan
kind: essay
category: Essay
intro: 当 episodic MDP 的反馈弱到连 trajectory 都看不见、只剩 episode 级 aggregate reward 时，学习仍可做到 ~O(√T) regret，但必须为信息缺失支付指数级结构复杂度。本文以技术文章方式梳理《Learning Markov Decision Processes under Fully Bandit Feedback》的背景、目标、创新、结论与展望。
---

强化学习理论里，一个常被默认却未必现实的前提，是 agent 在每一轮交互中不仅能看到自己走过的状态和动作，还能拿到逐步 reward。这个前提让 credit assignment、value estimation 和 optimism-based exploration 都有了相对明确的实现路径，也支撑了 episodic RL 在 semi-bandit feedback 下已经相当成熟的 regret 理论。

但真实系统并不总能给出这么细粒度的反馈。很多顺序决策问题里，系统能拿到的往往只是一次完整执行后的总结果：例如一次策略执行最终带来的总收益、一次在线决策流程最终的完成率、一次多步交互最终是否成功。在这种场景下，agent 看不到中间 trajectory，也无法把 reward 精确分摊到每一步动作上。于是问题就变成：**如果我们只能拿到一整个 episode 的 aggregate reward，而看不到中间状态与动作，MDP 还学不学得动？**

论文《Learning Markov Decision Processes under Fully Bandit Feedback》回答的正是这个问题。它研究的是比 trajectory feedback 更进一步压缩的信息结构：agent 不仅拿不到逐步 reward，连 trajectory 本身也看不到，只能在每轮结束后得到一个总回报信号。在这个设置下，作者给出了第一个计算高效、且 regret 仍保持在 \~O(√T) 量级的 episodic MDP 学习算法；同时也证明，这种设置下对结构参数的指数依赖并不是分析上的松弛，而是信息论意义上的必要代价。对一般 MDP，这个代价落在 horizon \(H\) 上；对 ordered MDP，则可以压缩到宽度/容量参数 \(k\) 上。[1]

这篇论文之所以值得单独写成技术文章，不是因为它又提供了一个新的 regret bound，而是因为它把一个长期被默认忽略的问题正式推到了前台：**反馈粒度本身，就是 MDP 可学习性的一部分。**

---

## 一、背景：为什么 fully bandit feedback 值得单独研究

过去几年，强化学习在有限时域 MDP 下的理论边界已经相当清晰。只要 agent 能看到访问过的 state-action 对以及逐步 reward，episodic RL 的 minimax regret 已经能被很好刻画。也正因为如此，很多理论结果默认采用 semi-bandit feedback：trajectory 可见，per-step reward 可见，局部 credit 也因此可恢复。[1]

但问题在于，现实世界中的反馈结构往往远没有这么慷慨。先前研究已经开始放宽这一点，例如 trajectory feedback：agent 可以看到自己走过的整条路径，但每轮只拿到一个 aggregate reward。相比 semi-bandit，这已经更接近某些实际系统，因为它不要求环境提供逐步可归因的奖励信号。

fully bandit feedback 则进一步走到更极端的一端：agent 既看不到逐步 reward，也看不到中间 trajectory，只能拿到 episode 结束后的一个总分数。这种设定的难度远高于 trajectory feedback，因为 learner 失去了最基础的中间监督信号。它不再能基于“我到了哪个状态”“我在哪一步做了哪个动作”来更新局部估计，而只能从一个压缩过的 scalar 结果中，反推出整条策略中哪些局部决策更可能有效。[1]

从理论角度说，这类问题之所以重要，在于它逼迫我们重新回答一个更基础的问题：**MDP 的可学习性，到底依赖环境结构，还是依赖反馈可见性？** semi-bandit setting 下，这两者常被混在一起；fully bandit feedback 则把两者拆开了。环境结构还在，policy 空间也还在，但反馈被压缩到了最低限度。此时若问题仍可学习，就说明结构本身已经提供了足够的可辨识性；若代价显著上升，也说明此前很多“RL 可学”的判断，其实暗中依赖了较强的观测假设。

这篇论文的重要性，就在于它把这个问题从直觉层面推进到了可证明的理论层面。

---

## 二、目标：论文到底想解决什么

论文研究的是 finite-horizon episodic MDP。状态按 stage 组织，每轮执行有固定 horizon \(H\)，每一层有最多 \(k\) 个状态，动作集合大小为 \(A\)。目标仍然是在线交互 \(T\) 轮后，尽可能逼近最优 policy，并最小化 cumulative regret。[1]

难点不在目标函数，而在反馈形式。每轮交互中，learner 先提交一整个 policy，然后环境只返回该 policy 执行一次后的 aggregate reward。中间经过了哪些状态、执行了哪些局部动作、在哪里发生了状态转移，learner 一概不知道。[1]

因此，这篇论文的目标可以拆成三个递进问题：

1. **算法问题**：在这种极弱反馈下，能否设计出计算高效、且 regret 次线性的学习算法？  
2. **边界问题**：如果能，regret 会比 semi-bandit / trajectory feedback 多付出多少代价？  
3. **结构问题**：这种代价是一般性的，还是可以通过结构先验显著改善？

这三个问题共同构成了全文主线。作者并没有满足于“给出一个 upper bound”，而是同时把算法、下界、结构化改进和应用场景连成了一个完整闭环。[1]

---

## 三、创新：这篇论文真正做了哪几件新事

### 1. 证明 fully bandit episodic MDP 仍然能做到 \~O(√T) regret

论文最直观的创新，是在 fully bandit feedback 下给出了第一个高效算法。这个结果本身已经不简单，因为最自然的思路是把每个 policy 当成一支 bandit arm，但那会立刻遇到指数级策略空间：policy 数量是 \(A^{Hk}\)，不论从统计上还是计算上都不可接受。[1]

作者绕开这条死路的关键，是没有在 policy 级别做 learning，而是把问题降到 state-level active set refinement：在每个状态维护一个仍可能最优的动作集合，然后通过分 phase 的方式反复探索、比较、消元。也就是说，它学的不是“哪条完整策略最好”，而是“在某个状态上，哪些动作已经可以安全排除”。这一步把问题从指数级策略搜索，重新拉回到 MDP 的局部结构上。

### 2. 构造了在看不到 trajectory 时仍能做局部比较的技术桥梁

如果说上一点是算法结构上的创新，那么真正的技术核心，是作者解决了一个更根本的问题：**在只能看到总回报时，如何比较某个状态上的两个动作谁更好？**

论文给出的答案，是通过 Explore-then-Refine（ExpRef）与 backward induction 构造一类特殊的实验策略：前缀部分随机探索，尾部策略固定，只在目标状态处切换待比较动作。这样一来，局部动作差异就会以“状态访问概率 × episode 均值差”的形式反映到 aggregate reward 上。换句话说，局部信息并没有消失，而是被访问概率 \(Q_{l,i}\) 稀释后嵌入了全局总回报。这个桥梁是全篇最关键的技术支点，因为没有它，fully bandit feedback 下就无法进行局部 credit assignment。[1]

### 3. 说明一般 MDP 中对 \(H\) 的指数依赖不是 proof artifact

论文的第三项创新，是把困难边界讲清了。一般 MDP 下，作者给出的 regret 上界 roughly 为 \((Ak)^H\sqrt{T}\) 量级；更重要的是，他们同时证明了对 horizon \(H\) 的指数依赖是必要的，而不是分析技巧不够锋利造成的结果。[1]

这件事理论意义非常大。因为一旦下界成立，它就意味着：在 fully bandit feedback 下，环境完全可以把关键信息隐藏在一整条长度 \(H\) 的动作序列里，而 learner 每轮只看到总 reward，这时它的信息处境就接近在 \(A^H\) 个 bandit arms 之间辨认最优臂。换句话说，**信息缺失本身就能把 horizon 变成复杂度瓶颈。**

### 4. 发现 ordered structure 可以把指数代价从 \(H\) 压到 \(k\)

如果论文只停在这里，结论虽然完整，但会显得过于悲观。它的第四项创新，是研究了一类带有强结构先验的 ordered MDP，并证明在这类问题中，regret 的指数 dependence 可以从 horizon \(H\) 改写为宽度/容量参数 \(k\)。[1]

ordered MDP 的核心在于：状态有自然顺序，转移只能 downward 或保持不变，同时动作也带有已知顺序，使得某些动作更倾向于让系统留在当前 level。利用这层信息，算法不再需要对前缀动作做完全均匀的随机探索，而是可以更多选择“更保守”的动作来提高关键状态的可达性。这样，访问概率控制会显著改善，误差递推自然也不再沿整个 horizon 指数爆炸。[1]

这说明一个非常重要的结论：在 fully bandit feedback 下，结构不是一个锦上添花的优化项，而是决定问题是否仍有现实可学性的核心变量。

### 5. 把理论结果连接到经典 sequential stochastic optimization

论文的最后一个重要创新，是没有把 ordered MDP 留在抽象层面，而是把它映射到了几个经典问题上，包括 k-item prophet inequality、sequential posted pricing 和 stochastic knapsack。[1]

这一步的意义在于，它表明论文回答的并不只是 RL 理论圈的一个特殊设定，而是在更一般地回答：**当一个顺序随机优化问题只能给出 outcome-level feedback，而中间过程不可见时，学习还能做到什么程度？**

这种跨域映射，让论文的价值从“一个新 regret bound”扩展到了“一个关于弱反馈 sequential decision 的统一理论视角”。

---

## 四、总结：这篇论文最终给出了什么判断

如果必须用一句话总结，我会说：**这篇论文证明了，在反馈极端贫瘠的情况下，episodic MDP 依然是可学习的，但代价不再主要体现为对时间维度 \(T\) 的学习速率，而是体现为对环境结构参数的指数复杂度。**

更具体一点，它给出的判断有四层：

1. fully bandit feedback 下，episodic MDP 并没有失去 \(\widetilde{O}(\sqrt{T})\) 意义上的可学习性；  
2. 但一般 MDP 中，对 horizon \(H\) 的指数 dependence 是必要的；  
3. 若环境满足 ordered structure，这个代价可以显著压缩到 \(k\)；  
4. 这种结构化结果并非纸上谈兵，而是直接适用于 prophet inequality、posted pricing、stochastic knapsack 等经典问题。[1]

这套结论最有价值的地方，在于它既不盲目乐观，也不空泛悲观。它没有说“极弱反馈也没关系，算法照样学得很好”，而是诚实地给出代价；但它也没有停在“太难了所以没法学”，而是进一步指出：只要结构先验足够强，fully bandit learning 依然可以被压回一个有意义的范围内。

这比单纯给一个 upper bound 更有洞察力，因为它真正告诉读者：**问题哪里难、为什么难、什么结构能救回来、救回来多少。**

---

## 五、展望：这篇论文对后续研究意味着什么

我认为这篇论文最大的长期意义，不是某个具体算法，而是它重新定义了弱反馈 sequential learning 的讨论方式。

第一，它提醒我们，未来在分析 RL 或 sequential decision 问题时，不能只看环境结构，也必须把反馈粒度作为一等公民。很多以往看似自然的结论，其实默认依赖了轨迹可见、逐步 reward 可见、局部 credit 可见等强观测假设。fully bandit feedback 让这些假设第一次被系统性剥离出来。[1]

第二，它为一类现实系统提供了理论参照。很多真实业务里，我们能拿到的确实只是最终 KPI 或整局 outcome，而不是每一步的中间标签。此时，问题不再是“能不能直接套用标准 RL”，而是要问：环境是否存在 ordered structure、容量约束、单调转移、阈值式动作等可利用结构。如果有，那么这篇论文给出的 ordered MDP 视角就会非常有启发性。

第三，它也为后续研究留下了很明确的空间。例如：

- 在 fully bandit 与 trajectory feedback 之间，是否还存在更细粒度的中间反馈模型，可得到更平滑的复杂度过渡？  
- 对 ordered MDP 之外的其他结构化 MDP，是否也能把指数 dependence 从 \(H\) 压缩到更小的结构参数？  
- 在实践层面，是否能设计出比 phase-based elimination 更高效、但仍可审计的弱反馈学习算法？

这些问题都不是本文彻底解决的，但正因为它把边界画清了，后续工作才知道该沿着哪里推进。

从这个意义上说，这篇论文真正完成的，不只是一个结果，而是一次叙事转向：**当反馈少到几乎只剩结果本身时，学习是否还成立，不再只是“探索够不够”的问题，而是“结构能不能提供足够可辨识性”的问题。**

这也是我认为它最值得被长期记住的地方。

---

## 参考来源

[1] Zhengjia Zhuo, Anupam Gupta, Viswanath Nagarajan. *Learning Markov Decision Processes under Fully Bandit Feedback*. arXiv, 2026.
