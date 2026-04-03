---
title: "在只看总分时学习 MDP：精读《Learning Markov Decision Processes under Fully Bandit Feedback》"
date: 2026-04-03 20:30:00 +0800
author: Ethan
kind: essay
category: Essay
intro: 当 episodic MDP 的反馈弱到连 trajectory 都看不见、只剩 episode 级 aggregate reward 时，学习仍可做到 ~O(√T) regret，但必须为信息缺失支付指数级结构复杂度。本文精读论文《Learning Markov Decision Processes under Fully Bandit Feedback》，系统解析其问题设定、ExpRef 算法、upper/lower bound、ordered MDP 改进及其对 prophet inequality 等问题的意义。
---

强化学习理论里，一个常被默认但未必现实的前提，是 agent 能看到自己走过的 state-action，以及每一步 reward。论文开篇就把这个前提挑明了：

> “A standard assumption in Reinforcement Learning is that the agent observes every visited state-action pair in the associated Markov Decision Process (MDP), along with the per-step rewards.”（Abstract, p.1）

但作者研究的不是这个经典 setting，而是更严苛的 fully bandit feedback：

> “In this paper, we consider a far more restrictive ‘fully bandit’ feedback model for episodic MDPs, where the agent does not even observe the visited state-action pairs—it only learns the aggregate reward.”（Abstract, p.1）

这意味着什么？

简单说，agent 每轮只知道“这局总共得了多少分”，却不知道：

- 走过哪些状态；
- 哪个动作导致了好结果或坏结果；
- 甚至不知道最终回报是沿哪条 trajectory 积累出来的。

这比 trajectory feedback 还要弱一层。论文在引言中明确区分：

> “In our setting, the agent does not even observe the trajectory—it merely receives the aggregate reward as feedback.”（§1 Introduction, p.2）

从理论角度看，这篇论文最重要的地方在于，它没有把问题止步于“能不能做”，而是完整回答了三个层次的问题：

1. **能不能学？** 能，而且能做到 ~O(√T) regret。  
2. **代价是什么？** 一般 MDP 下，regret 对 horizon 呈指数依赖。  
3. **这种代价能不能缓解？** 只有在 ordered MDP 这类有强结构先验的情形下，才可以把指数依赖从 \(H\) 压缩到 \(k\)。

也就是说，这篇文章真正建立的是一条关于 **feedback granularity 与 MDP 可学性边界** 的理论链条。

---

## 一、问题到底定义成了什么样

论文研究的是 finite-horizon episodic MDP，形式化为 \((H, k, A, P, r)\)。原文定义是：

> “We consider an episodic Markov Decision Process (MDP), given by the tuple (H, k, A, P, r). Here, H is the number of stages (horizon of each episode), k is the ‘width’ (i.e., number of states) in each stage, and A is the set of actions.”（§2 Problem Formulation, p.3）

其中：

- \(H\) 是每轮 episode 的长度；
- \(k\) 是每个 stage 的状态宽度；
- \(A\) 是动作集合；
- 状态按 stage 组织，只允许在相邻 stage 间转移；
- 所有 reward 非负，且单次执行的总 reward 被归一化到 1 以内。

真正关键的是反馈定义。作者写得非常明确：

> “In each episode t ∈ [T], the agent chooses a policy π^t and receives as feedback just the cumulative reward from one policy execution of π^t. This is the setting of bandit feedback.”（§2, p.4）

随后又补了一句更重要的话：

> “In particular, the agent does not observe the sequence of states visited by policy π. This makes our setting significantly harder than the standard semi-bandit feedback setting.”（§2, p.4）

这就是全文的核心矛盾：**学习目标仍是找最优 policy，但反馈被压缩成了单个 scalar。**

在 semi-bandit MDP learning 里，你能沿 trajectory 回溯 credit；在 fully bandit 里，你只能从“总分”反推是哪段 policy 可能有效。这使得问题本质上不再只是探索，而是**信息可辨识性**。

## 二、为什么最自然的办法会失败：把每个 policy 当成一支 arm

面对 only-aggregate-reward 的 setting，最顺手的 reduction 是：把每个 policy 看成一支 bandit arm，直接上 UCB。论文自己也先提出了这个想法：

> “A natural first attempt for MDP learning under bandit feedback is to apply the UCB algorithm by treating each policy as a single arm.”（§3, p.5）

但作者马上说明，这条路在统计和计算上都走不通：

> “However, this approach leads to a regret bound of A^{Hk/2} · √T as the total number of policies is A^{Hk}. This approach is also computationally inefficient as it requires storing an index for every policy.”（§3, p.5）

这个结论很关键。它说明 fully bandit feedback 的难点不是“bandit 很难”，而是 **policy 空间是指数级的**。如果没有额外结构，你就会退化成在 \(A^{Hk}\) 个巨型 arms 上做学习。

论文后续的全部技术工作，本质上都在回答一个问题：

**能不能在不显式枚举 policy 的前提下，仍然利用 MDP 的 stage-state 结构，对局部动作做学习和消元？**

答案是能，但代价由状态访问概率和 horizon 共同决定。

## 三、主算法的核心思想：不是消元 policy，而是消元每个 state 上的动作集

论文的算法主线是一个 successive elimination 框架，但它消掉的不是整个策略，而是每个 state 上的 active actions。

作者在引言里概括：

> “Our algorithm is based on a successive-elimination approach … where in each phase we explore all actions in an ‘active set’ and then refine the active sets using empirical maximizers.”（§1 Introduction, p.2）

在正文中，算法被进一步说明为一个带误差参数 \(\varepsilon\) 的 phase-based 过程：

> “Our algorithm proceeds in phases indexed by an error parameter ε > 0, maintaining an ‘active set’ A_{l,i} of actions for each state (l, i).”（§3, p.5）

其逻辑大致是：

1. 对每个 state \((l,i)\) 维护一个当前还“有希望”的动作集合 \(A_{l,i}\)；
2. 在当前 phase 中，围绕这些 active sets 运行一批 carefully designed episodes；
3. 用 bandit feedback 估计各动作相对经验最优动作的差距；
4. 删除差距足够大的动作，得到新的 refined set \(N_{l,i}\)；
5. 把误差参数 \(\varepsilon\) 缩小一半，进入下一轮。

原文是：

> “Then, the algorithm performs O(\frac{1}{ε^2} AkH log T) episodes with various policies using the active sets {A_{l,i}}. It then refines its active sets based on bandit feedback to obtain a new collection {N_{l,i}}.”（§3, p.5）

> “This ensures that we make significant progress towards optimality: the error parameter ε reduces by factor two in each phase.”（§3, p.5）

这里最重要的不是“phase”或“doubling trick”本身，而是作者把学习单元从 policy-level 降到了 state-level。这让问题不必直接面对 \(A^{Hk}\) 个策略，而是转化为：

- 如何让某个状态足够经常被访问；
- 如何在看不到 trajectory 的前提下，比较该状态的不同动作；
- 如何让这种局部比较沿 horizon 反向递推，最终影响全局 regret。

## 四、ExpRef 的两个核心难点：到不了状态，和看不清局部动作

论文把单个 phase 的子程序称为 **Explore then Refine（ExpRef）**。作者明确点出了两个技术难点。

### 1. 目标状态可能压根很难到达

原文写道：

> “The probability of reaching a particular state (l, i) depends on the sequence of actions taken before reaching it. This probability is difficult to control under bandit feedback. If it is too small, we cannot obtain sufficient information about that state.”（§3.1, p.5）

作者的解决思路是，先在前缀阶段故意做“统一随机探索”：

> “ExpRef uniformly samples actions at all states in the stages before i. This guarantees that the probability of reaching any given state is at least some fraction of the corresponding probability in the optimal policy.”（§3.1, p.5）

于是论文定义了随机 exploration policy \(\eta\) 和状态访问概率 \(Q_{l,i}\)，并在 Lemma 3.2 中给出一个关键访问概率下界：

> “For any i ∈ [H] and l, s ∈ [k], we have Q_{s,i+1} ≥ max_{a∈A_{l,i}} \frac{Q_{l,i}}{A} p_i(s | l, a).”（Lemma 3.2, p.6）

### 2. 局部动作价值依赖未来尾策略

第二个难点是，即便你到达了 state \((l,i)\)，也没法直接比较动作 \(a\) 和 \(b\)，因为它们的好坏还取决于后面的 tail policy。

作者直接写道：

> “Another challenge is that the value function (1) of a state also depends on future actions.”（§3.1, p.6）

所以算法不试图“一次性学出全局最优动作”，而是采用 backward induction：

> “Hence, instead of attempting to directly learn the optimal action, ExpRef proceeds via backward induction.”（§3.1, p.6）

## 五、全文最关键的桥梁：局部动作差异如何从总回报中被识别出来

我认为论文最值得记住的一条公式是 Lemma 3.5：

> “Φ_{l,i}(a) − Φ_{l,i}(b) = Q_{l,i} · [V_{l,i}(a, α̂_{j>i}) − V_{l,i}(b, α̂_{j>i})].”（Lemma 3.5, p.7）

这是全文真正的技术支点。

它说的是：在某种特殊构造的实验 policy 下，如果你只改变 state \((l,i)\) 的动作，那么你在 episode 层面看到的平均总回报变化，等于这个 state 被访问到的概率 \(Q_{l,i}\)，乘以该状态下两种动作在固定尾策略下的局部 value difference。

这意味着 fully bandit feedback 并不等于“局部信息完全消失”，而是说：**局部信息被访问概率稀释后，埋进了全局总回报的均值差里。**

## 六、为什么一般 MDP 的 regret 会对 \(H\) 呈指数依赖

一般 MDP 下，作者定义：

> “For any (l, i) ∈ [k] × [H], define C_{l,i} = (H − i + 1)(Ak)^{H−i}.”（Eq. (3), p.6）

并在每个状态只保留那些经验表现离最优不太远的动作。作者自己指出：

> “One of our main contributions is in coming up with the correct elimination thresholds (as a function of the stage and level) that enables an inductive proof of the regret bound.”（§3, p.5）

进一步的核心递推条件是 Lemma 3.3：

> “For any (l, i) ∈ [k] × [H], and a ∈ A_{l,i} we have: \frac{ε}{Q_{l,i}} + \sum_{s∈[k]} p_i(s | l, a) \frac{C_{s,i+1}}{Q_{s,i+1}} ε ≤ \frac{C_{l,i}}{Q_{l,i}} ε.”（Lemma 3.3, p.6-7）

由于访问概率本身会随着 horizon 展开而变小，而一般 MDP 又没有额外结构帮助你更强地控制 reachability，这个预算递推自然会长出 \((Ak)^{H-i}\) 级别的因子。

## 七、主定理：一般 episodic MDP 在 fully bandit feedback 下仍然可学，但代价很重

论文的第一个主结果是 Theorem 3.1：

> “There is an online learning algorithm for MDPs with unknown transition probabilities and bandit feedback having regret O(H^2 (Ak)^H √(HkAT log T)).”（Theorem 3.1, p.5）

正文里作者也给了更口语化的说法：

> “Our approach obtains a significantly better regret bound of roughly (Ak)^H √T, which we prove is nearly optimal.”（§3, p.5）

这个结果最值得读者把握的是两点：

- 对 \(T\) 的依赖仍然是 \(\sqrt{T}\)；
- 结构复杂度代价被转移到了 \(H\)。

## 八、这个指数 dependence 不是 proof artifact，而是 lower bound 逼出来的

作者在引言中先给结论：

> “We show that this exponential dependence of the regret on the horizon length H is necessary.”（§1 Introduction, p.2）

对应的正式表述是：

> “Any bandit-feedback learning algorithm for MDPs with k = 2 levels and horizon-length H has regret Ω(min{A^H √T, T}).”（Theorem 4.1, p.16）

作者还说明其 lower bound 构造本质上可规约到一个拥有 \(A^H\) 个 arms 的 Bernoulli bandit family。这说明一般 MDP 中对 \(H\) 的指数依赖不是可优化掉的小问题，而是 **fully bandit feedback 的本质代价**。

## 九、ordered MDP：结构先验是这篇论文真正给出的“第二答案”

作者研究了一类 structured MDP：

> “We now consider a class of structured MDPs which we refer to as ordered MDPs.”（§3.3, p.12）

它的核心假设是状态有序，且转移只能 downward：

> “In this setting, we assume k ≤ H and that the dynamics are restricted to allow only downward transitions.”（§3.3, p.12）

有了这个结构，论文给出更优 regret：

> “There is an online learning algorithm for ordered MDPs with unknown transition probabilities and bandit feedback having regret O((2eHkA/k)^k √(k^3 H A T log T)).”（Theorem 3.11, p.12）

并明确指出：

> “When k ≪ H, this regret bound is much better than the one for general MDPs.”（§3.3, p.12）

这组结果真正传达的信息是：**在 fully bandit feedback 下，结构不是锦上添花，而是决定问题是否仍有现实意义的关键变量。**

## 十、ordered MDP 为什么更好学：关键不在 learning core，而在 sampling 变聪明了

ordered MDP 的改进并不是推倒重来。作者明确说：

> “We only modify the Sampling Action part in the algorithm and keep the Learning part essentially the same.”（§3.3, p.12）

其 sampling 改造是：

> “with probability k/2H we perform uniform sampling over the available actions, and with the remaining probability 1 − k/2H we deterministically choose the ‘maximal’ action” （§3.3, p.12）

这会带来更强的访问概率下界。论文在 Lemma 3.12 中给出：

> “Q_{l,i+1} ≥ max_{a∈A_{l,i}} e^{-k/H} · Q_{l,i} · p_i(l|l,a).”（Lemma 3.12, p.13）

于是误差递推不再需要在每一层都支付一般 MDP 那样的全量代价，最终把指数 dependence 从 \(H\) 收缩到了 \(k\)。

## 十一、ordered MDP 也不是免费的：关于 \(k\) 的指数 dependence 仍然必要

作者没有把 ordered MDP 讲成一个“从此无忧”的故事，而是同样给了下界。引言里先概括说：

> “Again, we show that the exponential dependence on k is necessary.”（§1 Introduction, p.2）

这说明 ordered structure 只是把问题从“对 horizon 指数难”改写成“对容量参数指数难”，而不是让 fully bandit learning 变成一个普通的多项式难度问题。

## 十二、这篇论文为什么不只是 RL 理论：它其实连到了几个经典随机优化问题

ordered MDP 的价值不只是定义一个漂亮的子类，而是它确实覆盖了一批非常经典的问题。作者直接写道：

> “We show that ordered MDPs capture a number of classical stochastic optimization problems.”（§3.4, p.14）

其中最重要的几个应用是：

### 1. k-item Prophet Inequality

> “we obtain the first bandit learning algorithms for the widely studied k-item prophet inequality.”（§1 Introduction, p.2）

### 2. Sequential Posted Pricing

> “We can model SPP as an MDP with horizon H, width k and A actions.”（§3.4, p.15）

### 3. Stochastic Knapsack

> “We can model this as an MDP with horizon H, width k and A = 2 actions (accept or reject). Each state (l, i) corresponds to starting the policy at item i with remaining budget l.”（§3.4, p.15）

这部分的意义在于，论文不是在一个纯粹抽象的 RL 模型上做技巧，而是在回答：对于一类容量受限、顺序决策、反馈极弱的在线随机优化问题，我们到底还能学到什么程度。

## 十三、实验说明了什么：极弱反馈下，仍能接近强反馈基线

论文实验聚焦于 k-item prophet inequality，并将自己的算法与 UCB-VI 对比。作者专门提醒两种方法拿到的信息强度并不在一个水平上：

> “We highlight that our algorithms receive very little feedback: only the cumulative reward at the end of each episode. Whereas, UCB-VI receives feedback on all visited states and individual rewards.”（§5, p.19）

摘要中则直接总结实验定位：

> “our algorithm’s performance is comparable to that of a state-of-art learning algorithm (UCB-VI) with detailed state-action feedback.”（Abstract, p.1）

最重要的解读是：论文并没有声称 fully bandit 方法在 regret 上击败 UCB-VI。它真正说明的是，**即便你把反馈压缩得极端贫瘠，只剩 episode 总分，结构化算法的实际表现仍可能接近拿到详细 trajectory/reward 信息的强反馈基线。**

## 十四、局限与边界

尽管我认为这是一篇完成度很高的论文，但它的边界也必须讲清。

1. 一般 MDP 的指数 dependence 在实践上依然很重；
2. ordered MDP 的改进建立在强结构假设之上；
3. 实验主要集中在 k-item prophet inequality，覆盖面有限；
4. lower bound 也意味着在 fully bandit setting 下，乐观空间其实不大。

## 结语：当反馈少到几乎只剩结果本身，结构就成了学习能否成立的关键

如果要用一句更抽象的话概括这篇论文，我会说：它把“反馈粒度”正式纳入了 MDP learnability 的主叙事。

作者在摘要里的定义已经把问题说透：

> “the agent does not even observe the visited state-action pairs—it only learns the aggregate reward.”（Abstract, p.1）

而这篇论文给出的最终答案是：

- **能学**：在 fully bandit feedback 下，episodic MDP 仍可做到 ~O(√T) regret；
- **但代价很真实**：一般情形下，必须支付关于 \(H\) 的指数复杂度；
- **结构能部分缓解**：ordered MDP 可把指数 dependence 从 \(H\) 压到 \(k\)；
- **这不仅是抽象理论**：它直接覆盖 prophet inequality、posted pricing、stochastic knapsack 这类经典顺序随机优化问题。

所以，这篇论文最值得记住的，不只是某条定理或某个算法名字，而是它给出了一条非常清晰的结论：

**当 sequential decision 只能拿到 outcome-level 反馈时，学习是否仍然可能，最终取决于你还能从环境结构里榨出多少可辨识性。**
