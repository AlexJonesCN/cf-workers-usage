const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 从环境变量读取敏感信息
const ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const API_TOKEN = process.env.CF_API_TOKEN;

const endpoint = 'https://api.cloudflare.com/client/v4/graphql';

// GraphQL 查询：获取过去 7 天 Worker 的请求总数，按日期分组
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
        sum {
          requests
          errors
          cpuTime
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

async function fetchData() {
  try {
    const response = await axios.post(
      endpoint,
      { query },
      {
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = response.data.data.viewer.accounts[0].workersInvocationsAdaptive;
    
    // 将数据保存到 public 文件夹，供前端读取
    const outputPath = path.join(__dirname, '../public/data.json');
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log('数据抓取成功，已保存至 public/data.json');
    
  } catch (error) {
    const response = await axios.post(/*...*/);

    // 新增：如果 data 是 null，打印出 errors 数组看看到底错在哪
    if (response.data.data === null) {
        console.error('Cloudflare API 返回错误详情:', JSON.stringify(response.data.errors, null, 2));
        throw new Error('API 返回了 null 数据');
    }

    const data = response.data.data.viewer.accounts[0].workersInvocationsAdaptive;
    process.exit(1);
  }
}

fetchData();
