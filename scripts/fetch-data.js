const axios = require('axios');
const fs = require('fs');
const path = require('path');

const ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const API_TOKEN = process.env.CF_API_TOKEN;
const ZONE_ID = process.env.CF_ZONE_ID; 
const endpoint = 'https://api.cloudflare.com/client/v4/graphql';

// 数据文件路径
const DATA_PATH = path.join(__dirname, '../public/data.json');

async function fetchData() {
  if (!ACCOUNT_ID || !API_TOKEN) {
    console.error('❌ 错误: 环境变量丢失。请检查 CF_ACCOUNT_ID 和 CF_API_TOKEN。');
    process.exitCode = 1;
    return;
  }

  // 1. 准备查询时间范围
  const now = Date.now();
  const dateTo = new Date(now).toISOString();
  
  // Worker 请求数：API 支持直接查 30 天，所以我们总是获取最新的完整 30 天
  const dateFromWorker = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  
  // 流量数据：API 限制只能查 3 天，我们只抓取这“增量”的部分
  const dateFromTraffic = new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString();

  // 2. 构建 GraphQL 查询
  let queryStr = `
    query Viewer {
      viewer {
        accounts(filter: {accountTag: "${ACCOUNT_ID}"}) {
          workersInvocationsAdaptive(
            limit: 10000, 
            filter: {
              datetime_geq: "${dateFromWorker}",
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

  if (ZONE_ID) {
    queryStr += `
        zones(filter: {zoneTag: "${ZONE_ID}"}) {
          httpRequests1hGroups(
            limit: 10000,
            filter: {
              datetime_geq: "${dateFromTraffic}",
              datetime_leq: "${dateTo}"
            }
          ) {
            sum {
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
    
    // 3. 发送请求
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
      console.error('❌ 未找到 Worker 数据');
      process.exitCode = 1;
      return;
    }

    // 4. 获取新数据
    const newWorkerData = accounts[0].workersInvocationsAdaptive;
    let newTrafficData = [];
    if (ZONE_ID && viewer.zones && viewer.zones.length > 0) {
        newTrafficData = viewer.zones[0].httpRequests1hGroups;
        console.log(`✅ 获取到最新流量数据: ${newTrafficData.length} 条 (最近3天)`);
    }

    // ==========================================
    // 5. 核心逻辑：读取旧数据并合并 (增量保存)
    // ==========================================
    let mergedTraffic = [];

    // A. 尝试读取本地现有的 data.json
    if (fs.existsSync(DATA_PATH)) {
        try {
            const fileContent = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
            if (Array.isArray(fileContent.traffic)) {
                mergedTraffic = fileContent.traffic;
                console.log(`📂 读取本地历史流量数据: ${mergedTraffic.length} 条`);
            }
        } catch (e) {
            console.warn("⚠️ 本地数据读取失败，将重新建立数据库");
        }
    }

    // B. 合并逻辑：使用 Map 按时间戳去重
    // 逻辑：以时间点(datetime)为 Key。如果时间点相同，用“新抓到的数据”覆盖“旧数据”
    // 因为 Cloudflare 的数据在几小时内可能会修正，所以信赖最新的。
    const trafficMap = new Map();

    // 先放入旧数据
    mergedTraffic.forEach(item => {
        if (item.dimensions && item.dimensions.datetime) {
            trafficMap.set(item.dimensions.datetime, item);
        }
    });

    // 再放入新数据 (如果有重复时间点，会覆盖旧的)
    newTrafficData.forEach(item => {
        if (item.dimensions && item.dimensions.datetime) {
            trafficMap.set(item.dimensions.datetime, item);
        }
    });

    // C. 转回数组并排序
    mergedTraffic = Array.from(trafficMap.values());
    mergedTraffic.sort((a, b) => new Date(a.dimensions.datetime) - new Date(b.dimensions.datetime));

    // D. 数据裁剪：为了防止文件无限膨胀，只保留最近 35 天的流量数据
    const cutoffDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);
    mergedTraffic = mergedTraffic.filter(item => new Date(item.dimensions.datetime) > cutoffDate);

    console.log(`📊 合并后流量数据总量: ${mergedTraffic.length} 条`);

    // ==========================================
    // 6. 保存文件
    // ==========================================
    const output = {
        updatedAt: new Date().toISOString(),
        data: newWorkerData,       // Worker 数据总是存最新的 30 天 (API 原生支持)
        traffic: mergedTraffic     // 流量数据是累积下来的
    };
    
    // 确保目录存在
    const publicDir = path.dirname(DATA_PATH);
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
    
    fs.writeFileSync(DATA_PATH, JSON.stringify(output, null, 2));
    
    console.log(`✅ 数据已保存！Worker记录: ${newWorkerData.length} 条 | 流量记录: ${mergedTraffic.length} 条`);

  } catch (error) {
    console.error('❌ 请求异常:', error.message);
    if (error.response) {
        console.error('详情:', JSON.stringify(error.response.data, null, 2));
    }
    process.exitCode = 1;
  }
}

fetchData();
