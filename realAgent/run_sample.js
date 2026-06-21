const path = require('path');
const Agent = require('./agent');

async function run(){
  const promptPath = path.join(__dirname, 'ReAct_Prompt_v1.md');
  const agent = new Agent({promptPath, debug: true});
  const sampleTask = '写一个贪吃蛇游戏，使用HTML, css 和 js 实现，代码分别放在不同的clcl文件中, 并放入一个叫snake2的文件夹里';
  await agent.run(sampleTask);
}

run().catch(console.error);
