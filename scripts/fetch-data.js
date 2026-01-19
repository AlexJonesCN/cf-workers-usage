const axios = require('axios');
const fs = require('fs');
const path = require('path');

const ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const API_TOKEN = process.env.CF_API_TOKEN;
const endpoint = 'https://api.cloudflare.com/client/v4/graphql';

async function fetchData() {
  // 1. 检查环境变量
  if (!ACCOUNT_ID || !API_TOKEN) {
    console.error('❌ 错误: 环境变量丢失。请检查 GitHub Secrets 中的 CF_ACCOUNT_ID 和 CF_API_TOKEN');
    process.exitCode = 1;
    return;
  }

  const query = `
    query Viewer {
      viewer {
        accounts(filter: {accountTag: "${ACCOUNT_ID}"}) {
          workersInvocationsAdaptive(
            limit: 100,
            filter: {
              datetime_geq: "${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()}",
              datetime_leq: "${new Date().toISOString()}"
            }
          ) {
            sum { requests errors cpuTime }
            dimensions { datetime scriptName }
          }
        }
      }
    }
  `;

  try {
    // 隐藏部分 ID 仅作日志展示
    const maskedId = ACCOUNT_ID.length > 4 ? ACCOUNT_ID.slice(0, 4) + '***' : '***';
    console.log(`📡 正在连接 Cloudflare API... (Account ID: ${maskedId})`);

    const response = await axios.post(
      endpoint,
      { query },
      {
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000 // 10秒超时
      }
    );

    // 2. 检查 GraphQL 错误
    if (response.data.errors && response.data.errors.length > 0) {
      console.error('❌ Cloudflare API 返回业务错误:');
      console.error(JSON.stringify(response.data.errors, null, 2));
      process.exitCode = 1;
      return;
    }

    // 3. 检查数据结构
    const accounts = response.data?.data?.viewer?.accounts;
    if (!accounts || accounts.length === 0) {
      console.error('❌ 数据错误: 找不到该 Account ID 的数据。请检查 CF_ACCOUNT_ID 是否正确。');
      process.exitCode = 1;
      return;
    }

    const data = accounts[0].workersInvocationsAdaptive;
    
    // 4. 保存文件
    const publicDir = path.join(__dirname, '../public');
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
    
    fs.writeFileSync(path.join(publicDir, 'data.json'), JSON.stringify(data, null, 2));
    
    console.log('✅ 数据抓取成功！已保存至 public/data.json');

  } catch (error) {
    console.error('❌ 请求发生异常:');
    if (error.response) {
      console.error(`状态码: ${error.response.status}`);
      console.error('响应体:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('错误信息:', error.message);
    }
    process.exitCode = 1;
  }
} // <--- 这里的花括号必须有！

fetchData(); // <--- 这一行调用代码绝对不能漏！
