import requests
import json
import datetime
import os

API_TOKEN = os.environ["CF_API_TOKEN"]
ACCOUNT_ID = os.environ["CF_ACCOUNT_ID"]

# 查询“本月 Workers 请求数”
query = """
query WorkersUsage($accountTag: String!) {
  viewer {
    accounts(filter: {accountTag: $accountTag}) {
      workersInvocationsAdaptiveGroups(
        limit: 1,
        filter: {
          datetime_geq: "%s"
        }
      ) {
        sum {
          requests
        }
      }
    }
  }
}
""" % (datetime.datetime.utcnow().replace(day=1).date().isoformat())

url = "https://api.cloudflare.com/client/v4/graphql"

headers = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Content-Type": "application/json"
}

payload = {
    "query": query,
    "variables": {
        "accountTag": ACCOUNT_ID
    }
}

resp = requests.post(url, json=payload, headers=headers)
resp.raise_for_status()

result = resp.json()

used_requests = result["data"]["viewer"]["accounts"][0] \
    ["workersInvocationsAdaptiveGroups"][0]["sum"]["requests"]

# ===== 根据你的套餐调整 =====
TOTAL_REQUESTS = 100_000      # Free Workers 示例
# Paid Workers 可改成 10_000_000 或你自己的上限

output = {
    "updated_at": datetime.datetime.utcnow().isoformat() + "Z",
    "usage": {
        "requests": used_requests
    },
    "limits": {
        "requests": TOTAL_REQUESTS
    }
}

with open("data.json", "w") as f:
    json.dump(output, f, indent=2)

print("Workers usage updated:", used_requests)
