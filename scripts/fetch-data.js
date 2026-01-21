const axios = require('axios');
const fs = require('fs');
const path = require('path');

const ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const API_TOKEN = process.env.CF_API_TOKEN;
const ZONE_ID = process.env.CF_ZONE_ID; 
const endpoint = 'https://api.cloudflare.com/client/v4/graphql';

async function fetchData() {
  if (!ACCOUNT_ID || !API_TOKEN) {
    console.error('❌ 错误: 环境变量丢失。请检查 CF_ACCOUNT_ID 和 CF_API_TOKEN。');
    process.exitCode = 1;
    return;
  }

  // 获取过去 30 天的数据
  const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const dateTo = new Date().toISOString();

  let queryStr = `
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
  `;

  // 如果配置了 Zone ID，则追加流量查询
  if (ZONE_ID) {
    queryStr += `
        zones(filter: {zoneTag: "${ZONE_ID}"}) {
          httpRequests1hGroups(
            limit: 10000,
            filter: {
              datetime_geq: "${dateFrom}",
              datetime_leq: "${dateTo}"
            }
          ) {
            sum {
              # 👇 关键修改：使用 GraphQL 别名功能
              # 将数据库里的 'bytes' 字段取出来，伪装成 'edgeResponseBytes'
              # 这样前端 index.html 就不需要任何修改，直接能读到数据
              edgeResponseBytes: bytes
            }
            dimensions {
              datetime
            }
          }
        }
    `;
  }

  queryStr += `
      }
    }
  `;

  try {
    console.log(`📡 正在连接 Cloudflare API...`);
    if (!ZONE_ID) console.log(`⚠️ 未检测到 CF_ZONE_ID，将跳过流量数据抓取。`);

    const response = await axios.post(
      endpoint,
      { query: queryStr },
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

    const viewer = response.data?.data?.viewer;
    const accounts = viewer?.accounts;

    if (!accounts || accounts.length === 0) {
      console.error('❌ 未找到 Worker 数据 (Account ID 可能不匹配)');
      process.exitCode = 1;
      return;
    }

    const workerData = accounts[0].workersInvocationsAdaptive;
    
    // 获取流量数据（如果有）
    let trafficData = [];
    if (ZONE_ID && viewer.zones && viewer.zones.length > 0) {
        trafficData = viewer.zones[0].httpRequests1hGroups;
        console.log(`✅ 成功获取流量数据: ${trafficData.length} 条记录`);
    }

    const output = {
        updatedAt: new Date().toISOString(),
        data: workerData,
        traffic: trafficData
    };
    
    const publicDir = path.join(__dirname, '../public');
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
    
    fs.writeFileSync(path.join(publicDir, 'data.json'), JSON.stringify(output, null, 2));
    
    console.log(`✅ 数据保存成功！Worker记录: ${workerData.length} 条。`);

  } catch (error) {
    console.error('❌ 请求异常:', error.message);
    if (error.response) {
        console.error('详情:', JSON.stringify(error.response.data, null, 2));
    }
    process.exitCode = 1;
  }
}

fetchData();
