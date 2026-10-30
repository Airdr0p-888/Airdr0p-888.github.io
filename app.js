/* Agent AI 铸造页：地址填写 → 链上资格检查 → 生成可粘贴给 AI 代理的指令（支持中英切换） */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  // 公共节点会间歇性 403，逐个试探
  const RPCS = [
    "https://bsc.rpc.blxrbdn.com",
    "https://bsc-dataseed1.binance.org",
    "https://bsc-dataseed.binance.org",
    "https://bsc.publicnode.com",
    "https://binance.llamarpc.com",
  ];
  const CHAIN_ID = 56;
  const MINT_SIG = "0x1249c58b"; // mint()

  // 铸造次数上限：持有 ≥1 个 Agent ID → 1~10 次；未持有（游客）→ 只能 1 次
  const HOLDER_MAX_COUNT = 10;
  const GUEST_MAX_COUNT = 1;

  /* ---------------- 多语言 ---------------- */

  const I18N = {
    zh: {
      "brand.sub": "Agent ID 专属铸造 · BSC",
      "btn.connect": "连接钱包",
      "hero.title": "持有币安 <em>Agent ID</em> 铸造 1–10 次",
      "hero.sub": "每份 <b>{price}</b> USDT 换 <b>{perMint}</b> 枚 {symbol}。<br />持有 ≥1 个 Agent ID：可铸造 <b>1–10</b> 次；未持有：连接钱包可铸造 <b>1</b> 次。<br />填地址或连接钱包 → 检查资格 → 复制指令发给你的 AI 代理。",
      "hero.loading": "正在读取链上参数…",
      "card.mint": "铸造区",
      "label.addr": "钱包地址 / .ai 名称",
      "ph.addr": "0x… 或 yourname.ai",
      "hint.addr": "填 .ai 名称（如 aveai）会自动解析成地址；也可直接填 0x 地址",
      "label.tokenId": "Agent ID 编号（选填）",
      "ph.tokenId": "例如 1234",
      "label.count": "铸造次数",
      "hint.count": "持有 ≥1 个 Agent ID 可选 1–10 次；未持有只能铸造 1 次。点「检查资格」后选项会自动调整",
      "hint.count.holder": "持有 Agent ID：本次可选 1–{m} 次",
      "hint.count.guest": "未持有 Agent ID：已限制为 1 次（需先连接钱包）",
      "hint.count.guestOk": "未持有 Agent ID：已限制为 1 次",
      "adv.summary": "高级：合约 / 代币参数",
      "label.contract": "合约地址", "label.usdt": "USDT 合约", "label.nft": "Agent ID NFT",
      "btn.check": "检查资格", "btn.gen": "生成 AI 指令",
      "card.cmd": "AI 指令", "btn.copy": "复制",
      "ph.cmd": "填好地址后点「生成 AI 指令」，这里会出现可直接粘贴给 AI 代理的完整指令",
      "hint.cmd": "把这段指令粘到 Agentic Wallet 的 AI 对话里，它会逐步 preview 并等你确认。",
      "card.steps": "让 AI 代理帮你铸造",
      "s1.h": "开启开发者模式", "s1.p1": "在币安 App 中，为你的 Agentic Wallet 开启开发者模式。",
      "s1.p2": "Agentic Wallet → 设置 → 开发者模式",
      "s2.h": "检查资格", "s2.p1": "在上方铸造区输入你的 .ai 名称，或点右上角「连接钱包」。这个地址需要有：",
      "s2.l1": "Agent ID", "s2.l2": "每次", "s2.l2b": "USDT", "s2.l3": "少量 BNB 付手续费",
      "s2.l4": "未持有 Agent ID：连接钱包可铸造 1 次；持有 ≥1 个：可 1–10 次",
      "s3.h": "发给你的 AI 代理", "s3.p1": "把指令粘贴到 Agentic Wallet 的 AI 对话里。每一步它都会先预览，等你确认后再执行。",
      "card.apply": "如何申请 Agent ID",
      "invite.label": "专属邀请链接", "invite.go": "去注册", "invite.copy": "复制链接",
      "a1.h": "打开邀请链接", "a1.p": "用币安 App 扫码，或在币安 Web3 钱包内置浏览器打开，进入 Agent ID 页面。",
      "a2.h": "连接 / 创建 Agentic Wallet", "a2.p": "钱包里预留一点 BNB 付网络手续费。",
      "a3.h": "选 .ai 名称并提交", "a3.p": "按页面提示完成注册；是否仍需邀请名额，以官方页面显示为准。",
      "a4.h": "回来检查资格", "a4.p": "Agent ID 到账后，在上方铸造区填地址点「检查资格」，显示持有 ≥ 1 即可铸造。",
      "apply.note": "注册流程与名额以币安官方页面为准，可能随时调整。",
      "card.social": "社区与推广入口",
      "p1.b": "Agent ID 邀请", "p1.s": "注册领取 Agent ID",
      "p2.b": "Telegram", "p2.s": "电报社群",
      "p3.b": "X / Twitter", "p3.s": "官方推特",
      "p4.b": "Debox", "p4.s": "Debox 社群",
      "social.note": "搜索「请替换」即可找到待填链接；把 Telegram / X / Debox 三个换成你自己的地址。",
      "card.warn": "注意",
      "w1": "开盘前铸造到的 AGT <b>不可转账</b>，需等开盘后才能交易。",
      "w2": "每笔交易 AI 都会先 preview，请逐笔看清解析结果与风险再确认。",
      "w3": "本页只做地址填写与指令生成，不托管私钥、不代发交易。",
      "footer": "Agent AI · AGT — 本页不托管资产，请自行核对合约地址",

      "el.addr": "地址",
      "el.name": "Agent ID 名称 {n}", "el.resolved": "已解析为上方地址",
      "el.nftHold": "Agent ID 持有 {n} 个 · 可铸造 1–{m} 次",
      "el.nftGuest": "未持有 Agent ID · 连接钱包可铸造 {m} 次",
      "el.nftGuestLocked": "未持有 Agent ID · 请先连接钱包",
      "el.walletOn": "钱包已连接 · 与铸造地址一致",
      "el.walletOff": "钱包未连接",
      "el.nftGuestNote": "额度已锁为 1 次 · 看下方「合约门槛」那一行",
      "el.reqOn": "合约仍要求持有 Agent ID",
      "el.reqOnSub": "owner 需先关闭门槛，否则本次铸造会失败",
      "el.reqOff": "合约未强制 Agent ID",
      "el.reqOffSub": "未持有也可铸造",
      "el.usdt": "USDT 余额 {v}", "el.usdtNeed": "需 {v} USDT",
      "el.bnb": "BNB {v}", "el.bnbNeed": "需少量付 gas",
      "el.launched": "已开盘，不能再 mint", "el.notLaunched": "未开盘，可 mint",
      "el.progress": "已 mint {a}/{b}",
      "el.quota": "本地址剩余额度 {n} 次", "el.quotaSub": "上限 {m} 次，已用 {u}",
      "el.deadlineOk": "mint 未截止", "el.deadlineBad": "mint 已截止",
      "el.allow": "已授权 {v} USDT", "el.allowSkip": "第 1 笔可跳过", "el.allowNeed": "需要先授权",
      "el.loading": "正在读取链上数据…", "el.fail": "读取失败",

      "t.badAddr": "请填写 0x 地址或已注册的 .ai 名称",
      "t.needAddr": "请先填写 0x 地址或 .ai 名称",
      "t.noResolve": "解析失败：该 .ai 名称未注册，或格式不对",
      "t.resolving": "正在解析 .ai 名称…",
      "t.checkDone": "资格检查完成",
      "t.readFail": "链上读取失败：",
      "t.genOk": "指令已生成，点右上角复制",
      "t.copyOk": "已复制到剪贴板",
      "t.copyFail": "请按 Ctrl+C 复制",
      "t.copyLink": "链接已复制",
      "t.copyLinkFail": "复制失败，请手动复制",
      "t.walletOk": "钱包已连接",
      "t.connecting": "正在连接钱包…",
      "t.guestNeedWallet": "未持有 Agent ID：请先点右上角「连接钱包」，连接后只能铸造 1 次",
      "t.walletWrongNet": "钱包网络不是 BSC，已自动切换到 BSC 主网",
      "t.noWallet": "未检测到钱包插件",
      "t.connectFail": "连接失败",
      "t.genFirst": "请先生成指令",

      "cmd.guest": "该地址未持有 Agent ID，本次仅铸造 1 次",
      "cmd.body": `我有币安 Agentic Wallet，请在 BSC（binanceChainId {chain}）上帮我铸造 Agent AI（AGT）。
我的钱包地址：{addr}{idLine}

规则：
- 先运行 \`baw wallet settings --json\`，确认 devMode.enabled 为 true。
- 每笔交易都按「preview → 把解析结果和风险给我看 → 等我确认 → \`baw contract-call execute --requestId <这次 preview 返回的 requestId> --json\`」执行。
- 上一笔在链上确认成功后，再开始下一笔。
- 任何一步 preview 报错或被拦截，就停下告诉我，不要改参数重试。

第 1 笔：给 AGT 合约授权 {amountText} USDT（授权额度已够可跳过）
  合约: {uAddr}
  调用数据: {approveData}
  baw contract-call preview --binanceChainId {chain} --from {addr} --to {uAddr} --inputData {approveData} --json

{tail}：调用 AGT 合约的 mint()，共 {count} 笔，每笔单独 preview + execute，每笔 {priceText} USDT 换 {perMint} AGT
  合约: {cAddr}
  调用数据: {mintSig}
  baw contract-call preview --binanceChainId {chain} --from {addr} --to {cAddr} --inputData {mintSig} --json`,
    },

    en: {
      "brand.sub": "Agent ID exclusive mint · BSC",
      "btn.connect": "Connect wallet",
      "hero.title": "Hold Binance <em>Agent ID</em> · 1–10 mints",
      "hero.sub": "Each share costs <b>{price}</b> USDT for <b>{perMint}</b> {symbol}.<br />Holding ≥1 Agent ID: <b>1–10</b> mints. No Agent ID: <b>1</b> mint after connecting a wallet.<br />Enter an address or connect your wallet → check eligibility → copy the command to your AI agent.",
      "hero.loading": "Loading on-chain parameters…",
      "card.mint": "Mint",
      "label.addr": "Wallet address / .ai name",
      "ph.addr": "0x… or yourname.ai",
      "hint.addr": "A .ai name (e.g. aveai) is resolved to an address automatically; a 0x address also works",
      "label.tokenId": "Agent ID number (optional)",
      "ph.tokenId": "e.g. 1234",
      "label.count": "Mint count",
      "hint.count": "Holding ≥1 Agent ID: pick 1–10. No Agent ID: 1 mint only. Options adjust after Check eligibility",
      "hint.count.holder": "Agent ID held: 1–{m} mints available",
      "hint.count.guest": "No Agent ID: locked to 1 mint (connect your wallet first)",
      "hint.count.guestOk": "No Agent ID: locked to 1 mint",
      "adv.summary": "Advanced: contract / token params",
      "label.contract": "Contract", "label.usdt": "USDT contract", "label.nft": "Agent ID NFT",
      "btn.check": "Check eligibility", "btn.gen": "Generate command",
      "card.cmd": "AI command", "btn.copy": "Copy",
      "ph.cmd": "Fill in your address and click Generate — the full command for your AI agent appears here",
      "hint.cmd": "Paste it into your Agentic Wallet AI chat. It previews every step and waits for your confirmation.",
      "card.steps": "Let Your AI Agent Mint For You",
      "s1.h": "Enable Developer Mode", "s1.p1": "In the Binance App, enable Developer Mode for your Agentic Wallet.",
      "s1.p2": "Agentic Wallet → Settings → Developer Mode",
      "s2.h": "Check eligibility", "s2.p1": "Enter your .ai name above, or click Connect wallet at the top right. This address needs:",
      "s2.l1": "Agent ID", "s2.l2": "per mint", "s2.l2b": "USDT", "s2.l3": "A little BNB for gas",
      "s2.l4": "No Agent ID: 1 mint after connecting a wallet; holding ≥1: 1–10 mints",
      "s3.h": "Send it to your AI agent", "s3.p1": "Paste the command into your Agentic Wallet AI chat. It previews each step and waits for your confirmation.",
      "card.apply": "How to Apply for Agent ID",
      "invite.label": "Exclusive invite link", "invite.go": "Register", "invite.copy": "Copy link",
      "a1.h": "Open the invite link", "a1.p": "Scan with the Binance App or open it in the Binance Web3 wallet browser to reach the Agent ID page.",
      "a2.h": "Connect / create Agentic Wallet", "a2.p": "Keep a little BNB in the wallet for gas.",
      "a3.h": "Pick your .ai name and submit", "a3.p": "Follow the page instructions; whether an invite slot is still required follows the official page.",
      "a4.h": "Come back and check", "a4.p": "Once your Agent ID arrives, enter the address above and click Check — holding ≥ 1 means you can mint.",
      "apply.note": "The registration flow and availability follow Binance's official page and may change at any time.",
      "card.social": "Community & Links",
      "p1.b": "Agent ID invite", "p1.s": "Register and claim your Agent ID",
      "p2.b": "Telegram", "p2.s": "Telegram group",
      "p3.b": "X / Twitter", "p3.s": "Official X account",
      "p4.b": "Debox", "p4.s": "Debox community",
      "social.note": "Search the file for the placeholder links and replace Telegram / X / Debox with your own.",
      "card.warn": "Notes",
      "w1": "AGT minted before launch <b>cannot be transferred</b> until trading opens.",
      "w2": "Your AI previews every transaction — read each parsed result and risk note before confirming.",
      "w3": "This page only builds the command. It never holds your keys or sends transactions for you.",
      "footer": "Agent AI · AGT — this page does not custody assets; always verify the contract address",

      "el.addr": "Address",
      "el.name": "Agent ID name {n}", "el.resolved": "resolved to the address above",
      "el.nftHold": "Agent ID held: {n} · 1–{m} mints allowed",
      "el.nftGuest": "No Agent ID held · {m} mint after connecting a wallet",
      "el.nftGuestLocked": "No Agent ID held · connect your wallet first",
      "el.walletOn": "Wallet connected · same as the mint address",
      "el.walletOff": "Wallet not connected",
      "el.nftGuestNote": "locked to 1 mint · see the contract gate row below",
      "el.reqOn": "Contract still requires Agent ID",
      "el.reqOnSub": "the owner must disable the gate first, or this mint reverts",
      "el.reqOff": "Contract does not require Agent ID",
      "el.reqOffSub": "guests can mint too",
      "el.usdt": "USDT balance {v}", "el.usdtNeed": "need {v} USDT",
      "el.bnb": "BNB {v}", "el.bnbNeed": "keep some for gas",
      "el.launched": "Already launched — mint closed", "el.notLaunched": "Not launched — mint open",
      "el.progress": "minted {a}/{b}",
      "el.quota": "Remaining quota: {n}", "el.quotaSub": "limit {m}, used {u}",
      "el.deadlineOk": "Mint window open", "el.deadlineBad": "Mint window closed",
      "el.allow": "Allowance {v} USDT", "el.allowSkip": "step 1 can be skipped", "el.allowNeed": "approve first",
      "el.loading": "Reading on-chain data…", "el.fail": "Read failed",

      "t.badAddr": "Enter a 0x address or a registered .ai name",
      "t.needAddr": "Enter a 0x address or .ai name first",
      "t.noResolve": "Resolve failed: this .ai name is not registered or is malformed",
      "t.resolving": "Resolving .ai name…",
      "t.checkDone": "Eligibility check done",
      "t.readFail": "On-chain read failed: ",
      "t.genOk": "Command generated — click Copy",
      "t.copyOk": "Copied to clipboard",
      "t.copyFail": "Press Ctrl+C to copy",
      "t.copyLink": "Link copied",
      "t.copyLinkFail": "Copy failed, please copy manually",
      "t.walletOk": "Wallet connected",
      "t.connecting": "Connecting wallet…",
      "t.guestNeedWallet": "No Agent ID held: click Connect wallet at the top right first — guests get 1 mint",
      "t.walletWrongNet": "Wrong network — switched the wallet to BSC mainnet",
      "t.noWallet": "No wallet extension detected",
      "t.connectFail": "Connection failed",
      "t.genFirst": "Generate the command first",

      "cmd.guest": "This address holds no Agent ID — 1 mint only",
      "cmd.body": `I have a Binance Agentic Wallet. Please mint Agent AI (AGT) for me on BSC (binanceChainId {chain}).
My wallet address: {addr}{idLine}

Rules:
- First run \`baw wallet settings --json\` and confirm devMode.enabled is true.
- For every transaction: preview → show me the parsed result and risks → wait for my confirmation → \`baw contract-call execute --requestId <requestId from that preview> --json\`.
- Only start the next transaction after the previous one is confirmed on chain.
- If any preview errors out or gets blocked, stop and tell me. Do not retry with changed parameters.

Tx 1: approve {amountText} USDT to the AGT contract (skip if allowance is already enough)
  Contract: {uAddr}
  Input data: {approveData}
  baw contract-call preview --binanceChainId {chain} --from {addr} --to {uAddr} --inputData {approveData} --json

{tail}: call mint() on the AGT contract, {count} tx total, each with its own preview + execute, {priceText} USDT for {perMint} AGT per mint
  Contract: {cAddr}
  Input data: {mintSig}
  baw contract-call preview --binanceChainId {chain} --from {addr} --to {cAddr} --inputData {mintSig} --json`,
    },
  };

  // 换了 key：以前存过的语言偏好不再生效，一律从英文开始
  const LANG_KEY = "agt_lang_v2";

  let LANG = localStorage.getItem(LANG_KEY);
  if (LANG !== "zh" && LANG !== "en") LANG = "en"; // 默认英文

  function t(key, vars) {
    let s = (I18N[LANG] && I18N[LANG][key]) || (I18N.zh[key] && I18N.zh[key]) || key;
    if (vars) for (const k in vars) s = s.split("{" + k + "}").join(vars[k]);
    return s;
  }

  let heroVals = { price: "0.01", perMint: "21,000", symbol: "AGT", limit: "3" };
  let heroReady = false; // 是否已拿到真实参数（链上读到的或本地缓存的）

  // 上次读到的参数缓存，按合约地址存，刷新时先渲染它，避免先显示默认值再跳变
  const HERO_CACHE_KEY = "agt_hero_cache";

  function loadHeroCache(addr) {
    try {
      const m = JSON.parse(localStorage.getItem(HERO_CACHE_KEY)) || {};
      return m[String(addr).toLowerCase()] || null;
    } catch {
      return null;
    }
  }

  function saveHeroCache(addr, vals) {
    try {
      const m = JSON.parse(localStorage.getItem(HERO_CACHE_KEY)) || {};
      m[String(addr).toLowerCase()] = vals;
      localStorage.setItem(HERO_CACHE_KEY, JSON.stringify(m));
    } catch {}
  }

  /* ---------------- 铸造次数：持有者 1~10，未持有 1 ---------------- */

  let countUpper = HOLDER_MAX_COUNT;

  // 持有 ≥1 个 Agent ID → HOLDER_MAX_COUNT；未持有 → GUEST_MAX_COUNT；再受合约 MAX_PER_WALLET 与剩余额度约束
  function maxAllowed(holding, left) {
    let m = holding ? HOLDER_MAX_COUNT : GUEST_MAX_COUNT;
    if (info && info.maxPerWallet != null) m = Math.max(1, Math.min(m, Number(info.maxPerWallet)));
    if (left != null) m = Math.max(1, Math.min(m, Number(left)));
    return m;
  }

  function buildCountOptions(upper) {
    if (upper) countUpper = upper;
    const sel = $("count");
    const keep = sel.value || "1";
    sel.innerHTML = "";
    for (let i = 1; i <= countUpper; i++) {
      const o = document.createElement("option");
      o.value = String(i);
      o.textContent = LANG === "zh" ? `${i} 次` : `${i} time${i > 1 ? "s" : ""}`;
      sel.appendChild(o);
    }
    sel.value = Number(keep) >= 1 && Number(keep) <= countUpper ? keep : String(countUpper);
  }

  function setCountHint(holding, max, same) {
    const el = $("countHint");
    if (!el) return;
    el.textContent =
      holding === null || holding === undefined
        ? t("hint.count")
        : holding
        ? t("hint.count.holder", { m: String(max || HOLDER_MAX_COUNT) })
        : same
        ? t("hint.count.guestOk")
        : t("hint.count.guest");
  }

  // 当前地址是否就是已连接钱包的地址
  function walletSame(addr) {
    const a = addr || (resolved && resolved.addr);
    return !!(wallet && wallet.addr && a && wallet.addr.toLowerCase() === String(a).toLowerCase());
  }

  // 刷新下拉 + 提示，并把 select 的当前值返回
  function applyQuota(holding, addr, left) {
    const max = maxAllowed(holding, left);
    buildCountOptions(max);
    setCountHint(holding, max, walletSame(addr));
    return Number($("count").value);
  }

  function paintHero() {
    const sub = heroReady ? t("hero.sub", heroVals) : t("hero.loading");
    document.querySelectorAll("[data-i18n-html='hero.sub']").forEach((el) => (el.innerHTML = sub));
    document.querySelectorAll(".step .price").forEach((el) => (el.textContent = heroReady ? heroVals.price : "…"));
  }

  function applyLang(lang) {
    LANG = lang;
    localStorage.setItem(LANG_KEY, lang);
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    document.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
    document.querySelectorAll("[data-i18n-html]").forEach((el) => (el.innerHTML = t(el.dataset.i18nHtml)));
    document.querySelectorAll("[data-i18n-ph]").forEach((el) => (el.placeholder = t(el.dataset.i18nPh)));
    $("langBtn").textContent = lang === "zh" ? "EN" : "中";
    buildCountOptions(countUpper);
    setCountHint(lastCheck ? Number(lastCheck.nftBal) > 0 : null, countUpper, lastCheck && walletSame(lastCheck.a));
    paintHero();
    renderRows();
    paintWallet();
    if ($("cmd").value && resolved) $("cmd").value = buildCommand() || $("cmd").value;
  }

  let provider = null;
  let info = null;
  let wallet = null; // { addr } —— 注入型钱包（币安 Web3 钱包 / MetaMask 等）连接结果
  let lastCheck = null;
  let resolved = null; // { addr, name }

  function shortAddr(a) {
    return a.slice(0, 6) + "..." + a.slice(-4);
  }

  /* ---------- 钱包连接（EIP-1193 注入型钱包） ---------- */

  function injected() {
    if (typeof window === "undefined") return null;
    return window.binance || window.BinanceChain || window.ethereum || null;
  }

  function isSame(a, b) {
    return !!a && !!b && String(a).toLowerCase() === String(b).toLowerCase();
  }

  function paintWallet() {
    const b = $("connectBtn");
    if (!b) return;
    b.textContent = wallet && wallet.addr ? shortAddr(wallet.addr) : t("btn.connect");
  }

  async function connectWallet() {
    const w = injected();
    if (!w) return toast(t("t.noWallet"), "err");
    try {
      toast(t("t.connecting"));
      const accs = await w.request({ method: "eth_requestAccounts" });
      let chain = await w.request({ method: "eth_chainId" }).catch(() => null);
      if (chain && Number(chain) !== CHAIN_ID) {
        try {
          await w.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x" + CHAIN_ID.toString(16) }] });
          toast(t("t.walletWrongNet"), "ok");
        } catch {
          toast(t("t.connectFail"), "err");
          return;
        }
      }
      const a = accs && accs[0];
      if (!a) throw new Error("no account");
      wallet = { addr: ethers.getAddress(a) };
      $("addr").value = wallet.addr;
      resolved = { addr: wallet.addr, name: null };
      paintWallet();
      toast(t("t.walletOk"), "ok");
      await check(); // 连上后自动检查资格，顺带把可选次数按持有限额收紧
    } catch (e) {
      toast(t("t.connectFail"), "err");
    }
  }

  function bindWalletEvents() {
    const w = injected();
    if (!w || !w.on) return;
    w.on("accountsChanged", (accs) => {
      if (!accs || !accs[0]) {
        wallet = null;
      } else {
        wallet = { addr: ethers.getAddress(accs[0]) };
        $("addr").value = wallet.addr;
        resolved = { addr: wallet.addr, name: null };
      }
      paintWallet();
      renderRows();
    });
    w.on("chainChanged", () => {
      if (wallet) check();
    });
  }

  function toast(msg, type) {
    const el = $("toast");
    el.textContent = msg;
    el.className = "show " + (type || "");
    clearTimeout(el._t);
    el._t = setTimeout(() => ((el.className = type || ""), 3600));
  }

  async function getProvider() {
    if (provider) return provider;
    for (const url of RPCS) {
      try {
        const p = new ethers.JsonRpcProvider(url);
        await p.getBlockNumber();
        provider = p;
        return p;
      } catch {}
    }
    throw new Error("all public RPCs unavailable");
  }

  /* ---------- 地址 / .ai 名称解析 ----------
     Agent ID 基于 SPACE ID：tokenId = uint256(keccak256(标签))，ownerOf(tokenId) 即持有地址。
     标签不含 ".ai"，且区分大小写（链上按原始字节哈希）。 */

  function labelOf(v) {
    let s = v.trim();
    s = s.replace(/^@/, "").replace(/\.ai$/i, "");
    return /^[a-z0-9][a-z0-9-]{0,62}$/i.test(s) ? s : null;
  }

  async function ensureResolved() {
    const v = $("addr").value.trim();
    if (!v) {
      toast(t("t.needAddr"), "err");
      return null;
    }
    if (ethers.isAddress(v)) {
      resolved = { addr: ethers.getAddress(v), name: null };
      return resolved;
    }
    const label = labelOf(v);
    if (!label) {
      toast(t("t.noResolve"), "err");
      return null;
    }
    toast(t("t.resolving"));
    try {
      const p = await getProvider();
      const nft = new ethers.Contract($("nft").value.trim(), ["function ownerOf(uint256) view returns (address)"], p);
      const id = BigInt(ethers.keccak256(ethers.toUtf8Bytes(label)));
      const owner = await nft.ownerOf(id);
      if (!owner || owner === ethers.ZeroAddress) throw new Error("not registered");
      resolved = { addr: ethers.getAddress(owner), name: label + ".ai" };
      return resolved;
    } catch {
      toast(t("t.noResolve"), "err");
      return null;
    }
  }

  /* ---------- 载入合约参数（无需地址） ---------- */

  async function loadInfo() {
    const p = await getProvider();
    const c = new ethers.Contract(
      $("contract").value.trim(),
      [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function PRICE() view returns (uint256)",
        "function PER_MINT() view returns (uint256)",
        "function MAX_PER_WALLET() view returns (uint256)",
        "function MAX_MINTS() view returns (uint256)",
        "function mintCount() view returns (uint256)",
        "function mintDeadline() view returns (uint256)",
        "function launched() view returns (bool)",
        "function USDT() view returns (address)",
        "function AGENT_ID() view returns (address)",
        "function mintedBy(address) view returns (uint256)",
        "function agentIdRequired() view returns (bool)",
      ],
      p
    );
    const u = new ethers.Contract(
      await c.USDT(),
      ["function decimals() view returns (uint8)", "function balanceOf(address) view returns (uint256)", "function allowance(address,address) view returns (uint256)"],
      p
    );

    const [name, symbol, price, perMint, maxPerWallet, maxMints, mintCount, deadline, launched, usdtDec, nft] =
      await Promise.all([
        c.name(), c.symbol(), c.PRICE(), c.PER_MINT(), c.MAX_PER_WALLET(), c.MAX_MINTS(),
        c.mintCount(), c.mintDeadline(), c.launched(), u.decimals(), c.AGENT_ID(),
      ]);

    // 是否强制持有 Agent ID：老合约没有这个函数，读不到就当未知（undefined）
    let reqId;
    try {
      reqId = await c.agentIdRequired();
    } catch {
      reqId = undefined;
    }

    info = { c, u, contract: await c.getAddress(), name, symbol, price, perMint, maxPerWallet, maxMints, mintCount, deadline, launched, usdtDec, nft, reqId };

    heroVals = {
      price: ethers.formatUnits(price, usdtDec),
      perMint: Number(ethers.formatUnits(perMint, 18)).toLocaleString("en-US"),
      symbol,
      limit: String(maxPerWallet),
    };
    heroReady = true;
    saveHeroCache(info.contract, heroVals);
    paintHero();
    $("usdt").value = await info.u.getAddress();
    $("nft").value = nft;
    return info;
  }

  /* ---------- 资格检查 ---------- */

  function row(state, label, extra) {
    const cls = state === true ? "ok" : state === "warn" ? "warn" : "bad";
    const ic = state === true ? "✓" : state === "warn" ? "!" : "✗";
    return `<div class="row ${cls}"><i>${ic}</i><b>${label}</b><span>${extra || ""}</span></div>`;
  }

  // Agent ID 行：持有 → 1~10 次；未持有 → 连了钱包 1 次；没连钱包 → 提示去连
  function nftRow(d) {
    const hold = Number(d.nftBal) > 0;
    if (hold) return row(true, t("el.nftHold", { n: String(d.nftBal), m: String(d.countMax) }), "");
    if (d.walletSame) return row("warn", t("el.nftGuest", { m: String(d.countMax) }), t("el.nftGuestNote"));
    return row(false, t("el.nftGuestLocked"), t("btn.connect"));
  }

  function renderRows() {
    if (!lastCheck) return;
    const d = lastCheck;
    const rows = [
      row(true, t("el.addr"), d.a),
      ...(d.name ? [row(true, t("el.name", { n: d.name }), t("el.resolved"))] : []),
      row(d.walletSame, d.walletSame ? t("el.walletOn") : t("el.walletOff"), d.walletAddr ? shortAddr(d.walletAddr) : t("btn.connect")),
      nftRow(d),
      ...(d.reqId === null || d.reqId === undefined
        ? []
        : [row(d.reqId ? "warn" : true, d.reqId ? t("el.reqOn") : t("el.reqOff"), d.reqId ? t("el.reqOnSub") : t("el.reqOffSub"))]),
      row(d.usdtBal >= d.need, t("el.usdt", { v: d.fmtU(d.usdtBal) }), t("el.usdtNeed", { v: d.fmtU(d.need) })),
      row(d.bnb > 0n, t("el.bnb", { v: Number(ethers.formatEther(d.bnb)).toFixed(5) }), t("el.bnbNeed")),
      row(!d.launched, d.launched ? t("el.launched") : t("el.notLaunched"), t("el.progress", { a: String(d.mintCount), b: String(d.maxMints) })),
      row(d.left >= d.count, t("el.quota", { n: String(d.left) }), t("el.quotaSub", { m: String(d.maxPerWallet), u: String(d.minted) })),
      row(d.deadline > d.now, d.deadline > d.now ? t("el.deadlineOk") : t("el.deadlineBad"), new Date(d.deadline * 1000).toLocaleString()),
      row(d.allowance >= d.need, t("el.allow", { v: d.fmtU(d.allowance) }), d.allowance >= d.need ? t("el.allowSkip") : t("el.allowNeed")),
    ];
    $("elig").innerHTML = rows.join("");
    $("elig").classList.add("show");
  }

  async function check() {
    const r = await ensureResolved();
    if (!r) return;
    const a = r.addr;
    $("elig").classList.add("show");
    $("elig").innerHTML = row(false, t("el.loading"), "");
    try {
      const i = info || (await loadInfo());
      const nft = new ethers.Contract(i.nft, ["function balanceOf(address) view returns (uint256)"], provider);

      // 先读持有量和已铸次数，据此决定这次能选几次（剩余额度也要参与约束）
      const nftBal = await nft.balanceOf(a);
      const minted = await i.c.mintedBy(a);
      const holding = Number(nftBal) > 0;
      const left = Number(i.maxPerWallet) - Number(minted); // 单地址剩余
      const leftGlobal = Number(i.maxMints) - Number(i.mintCount); // 全场剩余
      const count = applyQuota(holding, a, Math.max(0, Math.min(left, leftGlobal)));
      const need = i.price * BigInt(count);

      const [usdtBal, bnb, allowance] = await Promise.all([
        i.u.balanceOf(a), provider.getBalance(a), i.u.allowance(a, i.contract),
      ]);

      const fmtU = (v) => Number(ethers.formatUnits(v, Number(i.usdtDec))).toLocaleString("en-US", { maximumFractionDigits: 6 });
      const walletAddr = wallet && wallet.addr ? wallet.addr : null;
      lastCheck = {
        a, name: r.name, count, need, nftBal, usdtBal, bnb, minted, allowance, fmtU,
        countMax: maxAllowed(holding, left), holding, walletAddr, walletSame: !!walletAddr && walletAddr.toLowerCase() === a.toLowerCase(),
        reqId: i.reqId === undefined ? undefined : i.reqId,
        launched: i.launched, mintCount: i.mintCount, maxMints: i.maxMints, maxPerWallet: i.maxPerWallet,
        left: Number(i.maxPerWallet) - Number(minted), deadline: Number(i.deadline), now: Math.floor(Date.now() / 1000),
      };
      renderRows();
      toast(t("t.checkDone"), "ok");
    } catch (e) {
      $("elig").innerHTML = row(false, t("el.fail"), e.shortMessage || e.message);
      toast(t("t.readFail") + (e.shortMessage || e.message), "err");
    }
  }

  /* ---------- 生成 AI 指令 ---------- */

  function buildCommand(count, holding) {
    const a = resolved && resolved.addr;
    if (!a) {
      toast(t("t.needAddr"), "err");
      return null;
    }
    count = count || Number($("count").value) || 1;
    const cAddr = ethers.getAddress($("contract").value.trim());
    const uAddr = ethers.getAddress($("usdt").value.trim());
    const dec = info ? Number(info.usdtDec) : 18;
    const price = info ? BigInt(info.price) : ethers.parseUnits("0.01", dec);
    const perMint = info ? Number(ethers.formatUnits(info.perMint, 18)).toLocaleString("en-US") : "21,000";
    const amount = price * BigInt(count);
    const amountText = Number(ethers.formatUnits(amount, dec)).toLocaleString("en-US", { maximumFractionDigits: 6 });
    const priceText = Number(ethers.formatUnits(price, dec)).toLocaleString("en-US", { maximumFractionDigits: 6 });

    const enc = ethers.AbiCoder.defaultAbiCoder().encode(["address", "uint256"], [cAddr, amount]);
    const approveData = "0x095ea7b3" + enc.slice(2);

    const tid = $("tokenId").value.trim();
    const ids = [];
    if (resolved && resolved.name) ids.push(`${LANG === "zh" ? "我的 Agent ID 名称" : "My Agent ID name"}: ${resolved.name}`);
    if (tid) ids.push(`${LANG === "zh" ? "我的 Agent ID 编号" : "My Agent ID number"}: #${tid}`);
    if (holding === false) ids.push(t("cmd.guest"));
    const idLine = ids.length ? "\n" + ids.join("\n") : "";
    const tail = count > 1 ? (LANG === "zh" ? `第 2～${count + 1} 笔` : `Tx 2-${count + 1}`) : LANG === "zh" ? "第 2 笔" : "Tx 2";

    return t("cmd.body", {
      chain: String(CHAIN_ID), addr: a, idLine, amountText, uAddr, approveData,
      cAddr, mintSig: MINT_SIG, tail, count: String(count), priceText, perMint,
    });
  }

  async function generate() {
    try {
      await loadInfo();
    } catch {}
    if (!(await ensureResolved())) return;
    const a = resolved.addr;

    // 生成前按最新持有情况刷新可选次数：持有 → 1~10；未持有 → 锁 1 次且必须已连接钱包
    let holding = null;
    try {
      const i = info || (await loadInfo());
      const nft = new ethers.Contract(i.nft, ["function balanceOf(address) view returns (uint256)"], await getProvider());
      holding = Number(await nft.balanceOf(a)) > 0;
    } catch {}
    const count = applyQuota(holding, a);
    const walletSame = !!(wallet && wallet.addr && wallet.addr.toLowerCase() === a.toLowerCase());
    if (holding === false && !walletSame) {
      toast(t("t.guestNeedWallet"), "err");
      return;
    }

    const cmd = buildCommand(count, holding);
    if (!cmd) return;
    $("cmd").value = cmd;
    toast(t("t.genOk"), "ok");
  }

  async function copyCmd() {
    const v = $("cmd").value;
    if (!v) return toast(t("t.genFirst"), "err");
    try {
      await navigator.clipboard.writeText(v);
      toast(t("t.copyOk"), "ok");
    } catch {
      $("cmd").select();
      toast(t("t.copyFail"), "err");
    }
  }

  /* ---------- 绑定 ---------- */

  $("langBtn").addEventListener("click", () => applyLang(LANG === "zh" ? "en" : "zh"));

  $("connectBtn").addEventListener("click", connectWallet);

  // 通用复制（邀请链接等）
  document.querySelectorAll("[data-copy]").forEach((b) =>
    b.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(b.dataset.copy);
        toast(t("t.copyLink"), "ok");
      } catch {
        toast(t("t.copyLinkFail"), "err");
      }
    })
  );

  // 换合约地址：先用该地址自己的缓存，再重新读链
  $("contract").addEventListener("change", () => {
    const c = loadHeroCache($("contract").value.trim());
    heroReady = !!c;
    if (c) heroVals = c;
    paintHero();
    loadInfo().catch(() => {
      heroReady = true;
      paintHero();
    });
  });

  $("checkBtn").addEventListener("click", check);
  $("genBtn").addEventListener("click", generate);
  $("copyBtn").addEventListener("click", copyCmd);

  // 先用缓存渲染（刷新时与上次完全一致，不会闪），再静默用链上数据校对
  const cached = loadHeroCache($("contract").value.trim());
  if (cached) {
    heroVals = cached;
    heroReady = true;
  }
  applyLang(LANG);
  bindWalletEvents();
  loadInfo().catch(() => {
    // 读不到链上参数时退回默认值，避免一直显示"读取中"
    heroReady = true;
    paintHero();
  });
})();
