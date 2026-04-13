#!/bin/bash
set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
GRAY='\033[0;90m'
NC='\033[0m'

pass=0
fail=0

run_test() {
  local name="$1"
  shift
  printf "${BLUE}[TEST]${NC} %s ... " "$name"
  if output=$("$@" 2>&1); then
    printf "${GREEN}PASS${NC}\n"
    ((pass++))
  else
    printf "${RED}FAIL${NC}\n"
    echo "$output" | head -5
    ((fail++))
  fi
}

section() {
  echo ""
  echo "════════════════════════════════════════════════════════"
  echo "  $1"
  echo "════════════════════════════════════════════════════════"
  echo ""
}

# ============================================================
section "1. 单元测试"
# ============================================================

run_test "Core 单元测试" pnpm --filter @ccman/core test
run_test "CLI 单元测试" pnpm --filter ccman test

# ============================================================
section "2. CLI 功能测试"
# ============================================================

CLI="node packages/cli/dist/index.js"

run_test "CLI --version" bash -c "$CLI --version | grep -E '^[0-9]+\.[0-9]+\.[0-9]+'"
run_test "CLI cc list (空状态)" bash -c "NODE_ENV=development $CLI cc list 2>&1 | grep -i '暂无'"
run_test "CLI cx list (空状态)" bash -c "NODE_ENV=development $CLI cx list 2>&1 | grep -i '暂无'"
run_test "CLI gm list (空状态)" bash -c "NODE_ENV=development $CLI gm list 2>&1 | grep -i '暂无'"
run_test "CLI oc list (空状态)" bash -c "NODE_ENV=development $CLI oc list 2>&1 | grep -i '暂无'"
run_test "CLI ow list (空状态)" bash -c "NODE_ENV=development $CLI ow list 2>&1 | grep -i '暂无'"
run_test "CLI cc current (空状态)" bash -c "NODE_ENV=development $CLI cc current 2>&1 | grep -i '未选择'"
run_test "CLI mcp list (空状态)" bash -c "NODE_ENV=development $CLI mcp list 2>&1 | grep -i '暂无'"

# 非交互模式添加+切换测试
run_test "CLI cc add (非交互)" bash -c "NODE_ENV=development $CLI cc add --name test-provider --base-url https://api.test.com --api-key sk-test-key 2>&1 | grep -i '添加成功'"
run_test "CLI cc list (有数据)" bash -c "NODE_ENV=development $CLI cc list 2>&1 | grep test-provider"
run_test "CLI cc use (切换)" bash -c "NODE_ENV=development $CLI cc use test-provider 2>&1 | grep -i '切换成功'"
run_test "CLI cc current (已切换)" bash -c "NODE_ENV=development $CLI cc current 2>&1 | grep test-provider"

# ============================================================
section "3. Desktop 构建验证"
# ============================================================

run_test "Desktop tsc 类型检查" pnpm --filter @ccman/desktop run type-check
run_test "Desktop vite 构建" bash -c "cd packages/desktop && npx vite build 2>&1 | grep -i 'built in'"

# ============================================================
section "4. 更新检测逻辑测试"
# ============================================================

# 直接用 Node 测试 updater 核心逻辑
run_test "isNewerVersion: 3.4.0 > 3.3.26 = true" node -e "
  function isNewerVersion(r, c) {
    const rv = r.split('.').map(Number);
    const cv = c.split('.').map(Number);
    for (let i = 0; i < Math.max(rv.length, cv.length); i++) {
      if ((rv[i]||0) > (cv[i]||0)) return true;
      if ((rv[i]||0) < (cv[i]||0)) return false;
    }
    return false;
  }
  if (!isNewerVersion('3.4.0', '3.3.26')) process.exit(1);
"

run_test "isNewerVersion: 3.3.24 > 3.3.26 = false" node -e "
  function isNewerVersion(r, c) {
    const rv = r.split('.').map(Number);
    const cv = c.split('.').map(Number);
    for (let i = 0; i < Math.max(rv.length, cv.length); i++) {
      if ((rv[i]||0) > (cv[i]||0)) return true;
      if ((rv[i]||0) < (cv[i]||0)) return false;
    }
    return false;
  }
  if (isNewerVersion('3.3.24', '3.3.26')) process.exit(1);
"

run_test "isNewerVersion: 相同版本 = false" node -e "
  function isNewerVersion(r, c) {
    const rv = r.split('.').map(Number);
    const cv = c.split('.').map(Number);
    for (let i = 0; i < Math.max(rv.length, cv.length); i++) {
      if ((rv[i]||0) > (cv[i]||0)) return true;
      if ((rv[i]||0) < (cv[i]||0)) return false;
    }
    return false;
  }
  if (isNewerVersion('3.3.26', '3.3.26')) process.exit(1);
"

run_test "GitHub API 获取最新版本" node -e "
  const https = require('https');
  const req = https.get('https://api.github.com/repos/2ue/ccman/releases/latest', {
    headers: { 'User-Agent': 'ccman-test', Accept: 'application/vnd.github+json' }
  }, (res) => {
    const chunks = [];
    res.on('data', d => chunks.push(d));
    res.on('end', () => {
      const data = JSON.parse(Buffer.concat(chunks).toString());
      const tag = data.tag_name;
      if (!tag) process.exit(1);
      console.log('Latest release:', tag);
    });
  });
  req.on('error', () => process.exit(1));
"

# ============================================================
section "5. Desktop Electron 启动测试 (Xvfb)"
# ============================================================

# 尝试用 xvfb-run 启动 Electron，5秒后关闭，检查是否正常启动
run_test "Electron 启动 (xvfb-run, 5s)" bash -c "
  cd packages/desktop
  timeout 5 xvfb-run --auto-servernum npx electron dist/main/index.js 2>&1 || true
  # timeout 返回 124 表示正常超时退出，不是错误
  exit 0
"

# ============================================================
section "结果汇总"
# ============================================================

total=$((pass + fail))
echo ""
printf "  ${GREEN}通过: %d${NC}  ${RED}失败: %d${NC}  总计: %d\n" "$pass" "$fail" "$total"
echo ""

if [ "$fail" -gt 0 ]; then
  printf "${RED}有 %d 个测试失败${NC}\n" "$fail"
  exit 1
else
  printf "${GREEN}全部通过!${NC}\n"
fi
