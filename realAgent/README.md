# Simple ReAct Agent (Node.js)

这是一个最小的示例实现，用于演示如何按 `ReAct_Prompt_v1.md` 中定义的格式运行一个简单的 agent。

快速开始：

1. 进入目录：

```bash
cd ReAct/realAgent
```

2. 运行示例：

```bash
node run_sample.js
```

3. 直接传入任务：

```bash
node index.js "你的问题文本"
```

说明：此实现是演示性质的 minimal agent，会打印符合 ReAct 标签的循环（`<task>`, `<thought>`, `<action>`, `<observation>`, `<final_answer>`）。

LLM 集成：

- 本示例支持通过 `OPENAI_API_KEY` 环境变量调用 OpenAI 的 Chat Completions API。默认模型为 `gpt-3.5-turbo`，可以通过在创建 `Agent` 时传入 `llm` 选项覆盖。
- 本示例支持通过 `OPENAI_API_KEY` 环境变量调用 OpenAI 的 Chat Completions API。默认模型现在为 `deepseek-v4`，可以通过在创建 `Agent` 时传入 `llm` 选项覆盖。

示例：在代码中使用不同模型或提供商

```js
const Agent = require('./agent');
// 指定模型
const agent1 = new Agent({ llm: { provider: 'openai', model: 'gpt-4' } });
// 或指定其它提供商（需在 agent 中实现相应 provider 支持）
const agent2 = new Agent({ llm: { provider: 'deepseek', model: 'deepseek-v4' } });
```
- 在 macOS / Linux 上导出 API key（不要把真实密钥上传或提交到仓库）：

```bash
export OPENAI_API_KEY="sk-..."
```

- 如果你想使用 DeepSeek 提供商，请设置 `DEEPSEEK_API_KEY` 和可选的 `DEEPSEEK_URL`：

```bash
export DEEPSEEK_API_KEY="sk-"
# 可选，覆盖默认 DeepSeek API 地址：
export DEEPSEEK_URL="https://api.deepseek.com/chat/completions"
```

- 然后运行示例（将尝试调用 LLM；若未设置 key，agent 会安全降级并给出提示）：

```bash
node run_sample.js
```

注意：使用真实 LLM 会产生费用，请确保你了解并设置了合适的配额与使用限制。
