# Cloudflare Workers Usage Monitor

📊 用于记录和可视化 Cloudflare Workers 使用额度的监控面板。


## ✨ 功能特性

- 📈 **实时用量监控** - 自动获取 Cloudflare Workers 调用数据并可视化展示
- 📊 **额度进度条** - 直观显示今日请求用量占比（基于免费版 100,000 次/天限制）
- 🕐 **多时间范围** - 支持查看最近 24 小时、7 天、30 天的统计数据
- 📉 **请求趋势图表** - 使用 ECharts 展示请求数和错误数趋势
- 🔄 **自动更新** - 通过 GitHub Actions 每小时自动同步数据
- 🌐 **GitHub Pages 部署** - 零成本托管，自动部署到 GitHub Pages

## 🖼️ 预览

访问在线演示：[workers-usage.265209.xyz](https://workers-usage.265209.xyz)

## 🚀 快速开始

### 1. Fork 本仓库

点击右上角的 **Fork** 按钮将仓库复制到你的账户下。

### 2. 配置 Cloudflare API 凭据

在你 Fork 的仓库中，进入 **Settings** → **Secrets and variables** → **Actions**，添加以下两个 Repository Secrets：

| Secret 名称 | 说明 |
|-------------|------|
| `CF_ACCOUNT_ID` | Cloudflare 账户 ID，可在 Cloudflare Dashboard 右侧边栏找到 |
| `CF_API_TOKEN` | Cloudflare API Token，需要 `Account Analytics: Read` 权限 |

#### 创建 API Token

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **My Profile** → **API Tokens**
3. 点击 **Create Token**
4. 使用 **Custom token** 模板
5. 添加以下权限：
   - **Account** → **Account Analytics** → **Read**
6. 完成创建并复制 Token

### 3. 启用 GitHub Pages

1. 进入仓库的 **Settings** → **Pages**
2. 在 **Source** 下选择 `gh-pages` 分支
3. 保存设置

### 4. 手动触发首次运行

1. 进入 **Actions** 标签页
2. 选择 **Update Worker Stats** 工作流
3. 点击 **Run workflow** 手动触发

## 📁 项目结构

```
cf-workers-usage/
├── . github/
│   └── workflows/
│       └── update-stats.yml    # GitHub Actions 工作流配置
├── public/
│   └── index.html              # 前端监控面板页面
├── scripts/
│   └── fetch-data.js           # 数据获取脚本
└── package.json
```

## ⚙️ 工作原理

1. **数据获取** - `fetch-data.js` 通过 Cloudflare GraphQL API 获取过去 30 天的 Workers 调用统计
2. **自动更新** - GitHub Actions 每小时执行一次数据同步
3. **数据存储** - 获取的数据保存为 `data.json` 文件
4. **页面展示** - `index.html` 加载 JSON 数据并使用 ECharts 进行可视化
5. **自动部署** - 使用 `peaceiris/actions-gh-pages` 自动部署到 GitHub Pages

## 🔧 自定义配置

### 修改更新频率

编辑 `.github/workflows/update-stats. yml` 中的 cron 表达式：

```yaml
schedule:
  - cron: '0 */1 * * *'  # 每小时运行一次
```

### 自定义域名

在 `.github/workflows/update-stats. yml` 中修改 `cname` 参数：

```yaml
- name: Deploy to GitHub Pages
  uses: peaceiris/actions-gh-pages@v3
  with:
    github_token:  ${{ secrets.GITHUB_TOKEN }}
    publish_dir: ./public
    cname: your-custom-domain.com  # 修改为你的域名
```

### 修改每日额度限制

在 `public/index.html` 中找到并修改：

```javascript
const DAILY_LIMIT = 100000;  // 修改为你的计划额度
```

## 📝 技术栈

- **前端**: HTML + CSS + JavaScript + [ECharts](https://echarts.apache.org/)
- **后端**: Node.js + [Axios](https://axios-http.com/)
- **CI/CD**: GitHub Actions
- **部署**: GitHub Pages

## 📜 许可证

ISC License

## 🤝 贡献

欢迎提交 Issues 和 Pull Requests！
