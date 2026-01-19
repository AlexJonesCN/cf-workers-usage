const axios = require('axios');
const fs = require('fs');
const path = require('path');

const ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const API_TOKEN = process.env.CF_API_TOKEN;
const endpoint = 'https://api.cloudflare.com/client/v4/graphql';

async function fetchData() {
  // 1. 基础检查
  if (!ACCOUNT_ID || !API_TOKEN) {
    console.error('❌ 错误: 环境变量丢失。请检查 GitHub Secrets。');
    process.exitCode = 1;
    return;
  }

  // 2. 获取过去 30 天的数据（匹配面板显示的月度概览）
  const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const dateTo = new Date().toISOString();

  // 这里的查询去掉了 cpuTime，只保留 requests 和 errors
  const query = `
    query Viewer {
      viewer {
        accounts(filter: {accountTag: "${ACCOUNT_ID}"}) {
          workersInvocationsAdaptive(
            limit: 1000,
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
    const maskedId = ACCOUNT_ID.slice(0, 4) + '***';
    console.log(`📡 正在连接 Cloudflare API... (Account ID: ${maskedId})`);

    const response = await axios.post(
      endpoint,
      { query },
      {
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000
      }
    );

    // 错误检查
    if (response.data.errors && response.data.errors.length > 0) {
      console.error('❌ API 返回错误:', JSON.stringify(response.data.errors, null, 2));
      process.exitCode = 1;
      return;
    }

    const accounts = response.data?.data?.viewer?.accounts;
    if (!accounts || accounts.length === 0) {
      console.error('❌ 未找到数据，请检查 Account ID。');
      process.exitCode = 1;
      return;
    }

    const data = accounts[0].workersInvocationsAdaptive;
    
    // 保存数据
    const publicDir = path.join(__dirname, '../public');
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
    
    fs.writeFileSync(path.join(publicDir, 'data.json'), JSON.stringify(data, null, 2));
    
    console.log(`✅ 数据抓取成功！共获取 ${data.length} 条记录。`);

  } catch (error) {
    console.error('❌ 请求异常:', error.message);
    if (error.response) console.error('响应详情:', JSON.stringify(error.response.data, null, 2));
    process.exitCode = 1;
  }
}

fetchData();
