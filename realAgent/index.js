#!/usr/bin/env node
const path = require('path');
const Agent = require('./agent');

async function main(){
  const args = process.argv.slice(2);
  if(args.length === 0){
    console.log('用法: node index.js "你的问题文本" [--debug] [promptPath]');
    console.log('  --debug  输出原始 API 请求/响应');
    process.exit(1);
  }

  let debug = false;
  const filtered = args.filter(a => {
    if(a === '--debug' || a === '-d'){ debug = true; return false; }
    return true;
  });

  const userTask = filtered[0];
  const promptPath = filtered[1] || path.join(__dirname, 'ReAct_Prompt_v1.md');

  const agent = new Agent({promptPath, debug});
  await agent.run(userTask);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
