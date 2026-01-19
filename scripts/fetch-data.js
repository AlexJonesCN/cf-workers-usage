const axios = require('axios');
const fs = require('fs');
const path = require('path');

const ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const API_TOKEN = process.env.CF_API_TOKEN;
const endpoint = 'https://api.cloudflare.com/client/v4/graphql';

async function fetchData() {
  if (!ACCOUNT_ID || !API_TOKEN) {
    console.error('❌ 错误: 环境变量丢失。请检查 GitHub Secrets。');
    process.exitCode = 1;
    return;
  }

  // 获取过去 30 天的数据
  const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const dateTo = new Date().toISOString();

  const query = `
    query Viewer {
      viewer {
        accounts(filter: {accountTag: "${ACCOUNT_ID}"}) {
          workersInvocationsAdaptive(
            limit: 10000, 
            filter: {
              datetime_geq: "${dateFrom}",
              datetime_leq: "${dateTo}"
            }
          ) {
            sum {
              requests
              errors
            }
            dimensions {
              datetime
              scriptName
            }
          }
        }
      }
    }
  `;

  try {
    console.log(`📡 正在连接 Cloudflare API...`);

    const response = await axios.post(
      endpoint,
      { query },
      {
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000
      }
    );

    if (response.data.errors && response.data.errors.length > 0) {
      console.error('❌ API 返回错误:', JSON.stringify(response.data.errors, null, 2));
      process.exitCode = 1;
      return;
    }

    const accounts = response.data?.data?.viewer?.accounts;
    if (!accounts || accounts.length === 0) {
      console.error('❌ 未找到数据 (Account ID 可能不匹配)');
      process.exitCode = 1;
      return;
    }

    const rawData = accounts[0].workersInvocationsAdaptive;
    
    // 👇👇👇 修改点开始：改变了保存的数据结构 👇👇👇
    const output = {
        updatedAt: new Date().toISOString(), // 记录当前脚本运行的时间 (UTC)
        data: rawData
    };
    
    const publicDir = path.join(__dirname, '../public');
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
    
    fs.writeFileSync(path.join(publicDir, 'data.json'), JSON.stringify(output, null, 2));
    // 👆👆👆 修改点结束 👆👆👆
    
    console.log(`✅ 数据抓取成功！共获取 ${rawData.length} 条记录。`);

  } catch (error) {
    console.error('❌ 请求异常:', error.message);
    process.exitCode = 1;
  }
}

fetchData();
