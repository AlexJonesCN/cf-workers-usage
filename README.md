# Cloudflare Worker Monitor

📊 一个现代化、高颜值的 Cloudflare Worker 用量监控面板。支持请求数与流量双维度分析，由 GitHub Actions 自动驱动。

![License](https://img.shields.io/github/license/alexjonescn/cf-workers-usage?v=1)
![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/alexjonescn/cf-workers-usage/update-stats.yml?label=Update%20Stats)

## ✨ 核心特性

- 📈 **全方位监控** - 同时追踪 **请求数 (Requests)** 和 **流量 (Data Transfer)** 使用情况。
- 🌍 **双语支持** - 内置中/英双语切换，一键国际化。
- 🌓 **智能主题** - 自动感应日夜模式 (8:00-20:00)，支持手动切换，配备磨砂玻璃质感 UI。
- 📊 **交互式图表** - 采用 ECharts 双 Y 轴设计，完美展示请求与流量的关联趋势。
- 💾 **增量数据存储** - 智能突破 Cloudflare 免费版 API 的 3 天流量查询限制，自动累积并永久保存历史流量数据。
- ⚡ **零成本部署** - 基于 GitHub Actions 定时抓取，GitHub Pages 免费托管。

## 🖼️ 在线预览

访问演示站点：[workers-usage.265209.xyz](https://workers-usage.265209.xyz)

> *提示：首次部署后，流量数据仅显示最近 3 天。随着时间推移，系统会自动累积历史数据，最终形成完整的月度/年度流量曲线。*

## 🚀 快速开始

### 1. Fork 本仓库

点击右上角的 **Fork** 按钮将仓库复制到你的账户下。

### 2. 获取 Cloudflare 凭据

你需要获取以下三个信息：

1.  **Account ID**: 在 Cloudflare Dashboard 首页右下角可以找到。
2.  **Zone ID**: 点击你的域名，在右侧边栏向下滚动可以找到（用于获取流量数据）。
3.  **API Token**: 需要特定的读取权限。

#### 🔑 如何创建正确的 API Token

1.  登录 [Cloudflare Profile > API Tokens](https://dash.cloudflare.com/profile/api-tokens)。
2.  点击 **Create Token** -> 选择 **Custom token** (自定义令牌)。
3.  配置以下权限（Permissions）：
    * **Account** -> **Account Analytics** -> **Read** (用于获取 Worker 请求数)
    * **Zone** -> **Analytics** -> **Read** (用于获取域名流量数据)
4.  完成创建并复制 Token。

### 3. 配置 GitHub Secrets

进入你 Fork 的仓库，点击 **Settings** → **Secrets and variables** → **Actions**，添加以下 Repository Secrets：

| Secret 名称 | 必填 | 说明 |
|-------------|------|------|
| `CF_ACCOUNT_ID` | ✅ | Cloudflare 账户 ID |
| `CF_API_TOKEN` | ✅ | 刚才创建的 API Token |
| `CF_ZONE_ID` | ❌ | 你的域名 Zone ID (如果不填，将无法展示流量数据) |

### 4. 启用 GitHub Pages

1.  进入仓库的 **Settings** → **Pages**。
2.  在 **Source** 下选择 `gh-pages` 分支（如果还没有该分支，请先执行下一步手动运行一次 Action）。
3.  保存设置。

### 5. 初始化运行

1.  进入 **Actions** 标签页。
2.  选择 **Update Worker Stats** 工作流。
3.  点击 **Run workflow** 手动触发首次运行。
4.  等待运行成功（显示绿色 ✅），稍后访问你的 GitHub Pages 链接即可看到面板。

## ⚙️ 自动更新机制

- **频率**: 默认每小时更新一次 (`cron: '0 */1 * * *'`)。
- **流量数据策略**:
    - Cloudflare 免费版 API 仅允许查询最近 3 天的流量数据。
    - 本项目的脚本 (`fetch-data.js`) 实现了**智能合并算法**：每次运行时，它会读取现有的 `data.json`，将新获取的 3 天数据与历史数据合并并去重。
    - **即使 API 有限制，你的面板也能拥有长期的流量历史记录！**

## 🔧 高级配置

### 修改每日额度
默认基于 Cloudflare 免费计划的 100,000 次请求/天。如需修改，请编辑 `public/index.html`：
```javascript
const DAILY_LIMIT = 100000; // 修改为你需要的数值
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

## 📝 技术栈

- **前端**: HTML + CSS + JavaScript + [ECharts](https://echarts.apache.org/)
- **后端**: Node.js + [Axios](https://axios-http.com/)
- **CI/CD**: GitHub Actions
- **部署**: GitHub Pages

## 📜 许可证

MIT License

## 🤝 贡献

欢迎提交 Issues 和 Pull Requests！
