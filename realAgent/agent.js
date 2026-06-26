const fs = require('fs').promises;

class Agent {
  constructor(options = {}){
    this.promptPath = options.promptPath || './ReAct_Prompt_v1.md';
    this.maxSteps = options.maxSteps || 10;
    this.llm = options.llm || { provider: 'deepseek', model: 'deepseek-v4-pro' };
    this.debug = options.debug !== undefined ? options.debug : (process.env.AGENT_DEBUG === 'true');
    // Bind helpers so they can be passed as callbacks without losing `this`
    for (const m of ['_c','_bold','_dim','_red','_green','_yellow','_cyan','_magenta','_truncate','_labelBox','_debugBox']){
      this[m] = this[m].bind(this);
    }
  }

  // ── tools available to the agent ────────────────────────────────

  async read_file(filePath){
    try{
      const content = await fs.readFile(filePath, 'utf8');
      return content;
    }catch(e){
      return `错误: 无法读取文件 ${filePath}`;
    }
  }

  async write_to_file(filename, content){
    try{
      await fs.writeFile(filename, content, 'utf8');
      return `写入成功: ${filename} (${content.length} 字符)`;
    }catch(e){
      return `错误: 无法写入文件 ${filename}`;
    }
  }

  async create_directory(dirPath){
    try{
      await fs.mkdir(dirPath, { recursive: true });
      return `创建成功: ${dirPath}`;
    }catch(e){
      return `错误: 无法创建文件夹 ${dirPath}`;
    }
  }

  // ── LLM engine (not a tool — the loop's decision engine) ────────

  async _callLLM(messages){
    const provider = this.llm?.provider || 'deepseek';
    const model = this.llm?.model || 'deepseek-v4-pro';

    const key = provider === 'openai' ? process.env.OPENAI_API_KEY : process.env.DEEPSEEK_API_KEY;
    if(!key) return `错误: ${provider === 'openai' ? 'OPENAI_API_KEY' : 'DEEPSEEK_API_KEY'} 未设置。`;
    const url = provider === 'openai'
      ? 'https://api.openai.com/v1/chat/completions'
      : (process.env.DEEPSEEK_URL || 'https://api.deepseek.com/v1/chat/completions');

    // ── debug: raw request ──
    if(this.debug){
      const lastMsg = messages[messages.length - 1];
      const summary = messages.map(m => `[${m.role}] ${this._truncate(m.content, 200)}`).join('\n');
      this._debugBox('📤 RAW REQUEST', [
        `URL:     ${url}`,
        `Model:   ${model}`,
        `Messages (${messages.length} total):`,
        summary,
        ``,
        `--- Last message (full) ---`,
        `[${lastMsg.role}] ${lastMsg.content}`,
      ].join('\n'));
    }

    try{
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({ model, messages, max_tokens: 8192 })
      });

      if(!res.ok){
        const t = await res.text();
        const errMsg = `错误: ${provider} 请求失败 (${res.status}) ${t}`;
        if(this.debug) this._debugBox('📥 RAW RESPONSE (error)', this._red(errMsg));
        return errMsg;
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content || '';

      // ── debug: raw response ──
      if(this.debug){
        const usage = data?.usage ? `prompt:${data.usage.prompt_tokens}  completion:${data.usage.completion_tokens}  total:${data.usage.total_tokens}` : 'N/A';
        const finishReason = data?.choices?.[0]?.finish_reason || 'N/A';
        this._debugBox('📥 RAW RESPONSE', [
          `Tokens:   ${usage}`,
          `Finish:   ${finishReason}`,
          `Content length: ${content.length} chars`,
          `──────────────────────────────────────────────────────`,
          content,
        ].join('\n'));
      }

      return content;
    }catch(e){
      const errMsg = `错误: ${provider} 异常: ${e.message}`;
      if(this.debug) this._debugBox('📥 RAW RESPONSE (exception)', this._red(errMsg));
      return errMsg;
    }
  }

  // ── ReAct response parser ───────────────────────────────────────

  _parseResponse(text){
    // Guard: if LLM hallucinated <observation>, strip it and warn
    let cleaned = text;
    if(/<observation>/i.test(text)){
      console.log(this._dim('  ⚠️  LLM generated <observation> — stripped (observations come from tools, not the LLM)'));
      cleaned = text.replace(/<observation>[\s\S]*?<\/observation>/gi, '');
    }
    // Also strip <task> — it belongs in the first user message, not the LLM response
    if(/<task>/i.test(cleaned)){
      cleaned = cleaned.replace(/<task>[\s\S]*?<\/task>/gi, '');
    }

    // Only keep the FIRST thought/action pair (ignore multi-turn attempts)
    const extract = (tag) => {
      const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i');
      return (cleaned.match(re) || [])[1]?.trim() || '';
    };
    return {
      thought:      extract('thought'),
      action:       extract('action'),
      finalAnswer:  extract('final_answer'),
    };
  }

  // ── tool dispatcher ─────────────────────────────────────────────

  _unescapeContent(str){
    // Unescape characters that LLMs commonly escape inside quoted strings
    return str
      .replace(/\\"/g, '"')
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\r/g, '\r')
      .replace(/\\\\/g, '\\');
  }

  async _executeAction(actionText){
    // read_file("path")
    let m = actionText.match(/read_file\("([^"]+)"\)/);
    if(m) return await this.read_file(this._unescapeContent(m[1]));

    // write_to_file("filename", "content")
    m = actionText.match(/write_to_file\("([^"]+)"\s*,\s*"([\s\S]+)"\)/);
    if(m) return await this.write_to_file(this._unescapeContent(m[1]), this._unescapeContent(m[2]));

    // create_directory("path")
    m = actionText.match(/create_directory\("([^"]+)"\)/);
    if(m) return await this.create_directory(this._unescapeContent(m[1]));

    return `未知操作: "${actionText}"。可用工具: read_file("path"), write_to_file("name", "content"), create_directory("path")`;
  }

  // ── formatting helpers ──────────────────────────────────────────

  _c(code, text){ return `\x1b[${code}m${text}\x1b[0m`; }
  _bold(t){ return this._c(1, t); }
  _dim(t){  return this._c(2, t); }
  _red(t){  return this._c(31, t); }
  _green(t){ return this._c(32, t); }
  _yellow(t){ return this._c(33, t); }
  _cyan(t){  return this._c(36, t); }
  _magenta(t){ return this._c(35, t); }

  _truncate(text, maxLen = 600){
    if(!text) return text;
    if(text.length <= maxLen) return text;
    return text.slice(0, maxLen) + '\n' + this._dim('…(truncated)');
  }

  _labelBox(label, content, colorFn){
    const line = this._dim('─'.repeat(60));
    console.log(`\n${line}`);
    console.log(` ${colorFn(this._bold(label))}`);
    console.log(`${line}`);
    console.log(content);
    console.log(`${line}`);
  }

  _debugBox(label, content){
    const line = this._dim('┄'.repeat(70));
    console.log(`\n${line}`);
    console.log(` ${this._dim(this._bold(label))}`);
    console.log(`${line}`);
    console.log(this._dim(content));
    console.log(`${line}`);
  }

  // ═══════════════════════════════════════════════════════════════
  //  ReAct Loop — the real thing
  // ═══════════════════════════════════════════════════════════════

  async run(userTask){
    console.log('\n' + this._bold('╔══════════════════════════════════════════════════╗'));
    console.log(this._bold('║') + '              🧠  ReAct Agent Start              ' + this._bold('║'));
    console.log(this._bold('╚══════════════════════════════════════════════════╝'));

    this._labelBox('📋 TASK', this._bold(userTask), this._cyan);

    // 1. Load system prompt
    const systemPrompt = await this.read_file(this.promptPath);
    if(systemPrompt.startsWith('错误:')){
      console.log(this._red(systemPrompt));
      return;
    }

    // 2. Build conversation: system prompt + user task
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userTask }
    ];

    let steps = 0;
    let lastObservation = '';
    let lastAction = '';
    let consecutiveNoNew = 0;

    // 3. ReAct loop
    while(steps < this.maxSteps){
      steps++;

      // ── step header ──
      console.log('\n' + this._dim('┌' + '─'.repeat(58) + '┐'));
      console.log(this._dim('│') + `  Step ${steps}/${this.maxSteps}` + ' '.repeat(46) + this._dim('│'));
      console.log(this._dim('└' + '─'.repeat(58) + '┘'));

      // ── call LLM ──
      const response = await this._callLLM(messages);

      // ── parse ──
      const { thought, action, finalAnswer } = this._parseResponse(response);

      // ── display thought ──
      if(thought){
        this._labelBox('💭 THOUGHT', this._yellow(thought), this._yellow);
      }

      // ── final answer? ──
      if(finalAnswer){
        this._labelBox('✅ FINAL ANSWER', this._magenta(this._bold(finalAnswer)), this._magenta);
        console.log('\n' + this._bold('╔══════════════════════════════════════════════════╗'));
        console.log(this._bold('║') + '               🏁  Agent Finished               ' + this._bold('║'));
        console.log(this._bold('╚══════════════════════════════════════════════════╝\n'));
        return;
      }

      // ── no action? nudge the LLM ──
      if(!action){
        messages.push({ role: 'assistant', content: response });
        messages.push({ role: 'user', content: '请按格式输出 <thought> 和 <action>，或直接给出 <final_answer>。' });
        continue;
      }

      // ── display action ──
      this._labelBox('🔧 ACTION', this._cyan(action), this._cyan);

      // ── execute ──
      const observation = await this._executeAction(action);
      this._labelBox('👁  OBSERVATION', this._green(this._truncate(observation)), this._green);

      // ── detect repetition & feed observation back to LLM ──
      const actionType = action.replace(/\(.*\)/s, '').trim();
      const isRepeat = (actionType === lastAction && observation === lastObservation);
      lastObservation = observation;
      lastAction = actionType;

      messages.push({ role: 'assistant', content: response });

      if(isRepeat){
        consecutiveNoNew++;
        if(consecutiveNoNew >= 2){
          // Soft signal: tell the LLM it's repeating, but let it decide
          this._labelBox('🔁 REPEAT DETECTED', this._dim(
            `连续 ${consecutiveNoNew} 次 ${actionType} 返回相同结果 → 提示 LLM（不强制终止）`), this._yellow);
          messages.push({ role: 'user', content: `<observation>${observation}</observation>\n\n注意：连续 ${consecutiveNoNew} 次相同操作返回了相同结果。如果信息已足够，请给出 <final_answer>；如果仍需其他操作，请继续。` });
        } else {
          messages.push({ role: 'user', content: `<observation>${observation}</observation>` });
        }
      } else {
        consecutiveNoNew = 0;
        messages.push({ role: 'user', content: `<observation>${observation}</observation>` });
      }
    }

    // Max steps exhausted
    this._labelBox('⚠️  FINAL ANSWER',
      this._red('到达最大步骤限制，基于当前信息无法进一步处理。'), this._magenta);
    console.log('');
  }
}

module.exports = Agent;
