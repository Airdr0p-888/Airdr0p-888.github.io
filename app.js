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
  const MINT_SIG = "0x836a1040"; // 新版：mint(uint256 shares, address referrer, uint256 maxCost)
  const MINT_SIG_LEGACY = "0x1249c58b"; // 旧版：mint() 无参，一次只能买 1 份

  /* ---------------- 多语言 ---------------- */

  const I18N = {
    zh: {
      "brand.sub": "Agent ID 专属铸造 · BSC",
      "btn.connect": "连接币安钱包",
      "btn.walletMint": "一键铸造（Mint）",
      "wc.hint": "连接持有你 .ai Agent ID 的币安钱包，即可在本页直接铸造（approve + mint 两笔交易）",
      "wc.title": "代理钱包",
      "wc.tip": "连接币安代理钱包以读取此钱包上的 .ai 代理 ID。",
      "wc.badgeConnecting": "连接中",
      "wc.badgeOk": "已连接",
      "wc.pairLabel": "配对码",
      "wc.pairTip": "用币安 App 扫码，确认配对码一致后再确认授权。",
      "wc.afterConfirm": "你确认后，本页会自动切换到你的钱包。",
      "wc.waiting": "正在等待币安 App",
      "wc.regular": "使用普通钱包",
      "wc.noInjected": "没有检测到浏览器钱包插件",
      "wc.openApp": "打开币安登录",
      "wc.cancel": "取消连接",
      "wc.notBinance": "检测到非币安钱包（如小狐狸）。本页只连币安钱包：请在币安 App 内打开本站，或安装币安钱包插件，也可用扫码连接。",
      "wc.scanMode": "未检测到币安钱包：点「一键铸造」会弹出二维码，用币安 App 扫码授权后自动完成铸造。",
      "wc.copyLink": "复制本站网址",
      "wc.copyLinkOk": "网址已复制，粘到币安 App 内打开即可直接连钱包铸造",
      "wc.qrReady": "二维码已生成，用币安 App 扫描授权",
      "wc.slowHint": "连接服务迟迟没有响应：多半是 Reown 后台没把本站域名加进 Allowed origins，也可能是网络被限制。可改用「复制本站网址」在币安 App 内打开。",
      "wc.noWay": "此浏览器既没有币安钱包，也无法建立扫码连接。请在币安 App 内打开本站（Web3 钱包 → 发现 → 粘贴网址），或使用「生成 AI 指令」让 AI 代理代铸。",
      "wc.connectingFirst": "正在连接币安钱包…",
      "wc.needId": "未配置 WalletConnect projectId，扫码连接不可用",
      "wc.pidSaved": "projectId 已保存",
      "wc.connecting": "正在建立连接…",
      "wc.connected": "钱包已连接",
      "wc.needConnect": "请先点右上角连接币安钱包",
      "wc.needInfo": "链上参数还没读到，请稍等再试",
      "tx.mint": "铸造交易",
      "tx.approve": "授权交易",
      "tx.gas": "gas",
      "cmd.body.legacy": `我有币安 Agentic Wallet，请在 BSC（binanceChainId {chain}）上帮我铸造 {name}。
我的钱包地址：{addr}{idLine}

规则：
- 先运行 \`baw wallet settings --json\`，确认 devMode.enabled 为 true。
- 每笔交易都按「preview → 把解析结果和风险给我看 → 等我确认 → \`baw contract-call execute --requestId <这次 preview 返回的 requestId> --json\`」执行。
- gas 预估加 20%。
- 上一笔在链上确认成功后，再开始下一笔。
- 任何一步 preview 报错或被拦截，就停下告诉我，不要改参数重试。

第 1 笔：给 {name} 合约授权 {amountText} USDT（授权额度已够可跳过；按 1.02 倍给）
  合约（USDT）: {uAddr}
  approve(spender = {cAddr}, amount = {amountText} USDT)
  调用数据: {approveData}
  baw contract-call preview --binanceChainId {chain} --from {addr} --to {uAddr} --inputData {approveData} --json

{tail}：调用 {name} 合约的 mint()，共 {count} 笔，每笔单独 preview + execute，每笔 {priceText} USDT 换 {perMint} {name}
  合约: {cAddr}
  调用数据: {mintData}
  baw contract-call preview --binanceChainId {chain} --from {addr} --to {cAddr} --inputData {mintData} --json

本次共 {count} 份 = {costText} USDT，预计得到 {totalText} {name}。
注意：绝不能直接把 USDT 转到 mint 合约，必须 approve 后调用 mint；只有 {cAddr} 收款。`,
      "hero.title": "持有币安 <em>Agent ID</em> 才能铸造",
      "hero.sub": "每次 <b>{price}</b> USDT 换 <b>{perMint}</b> 枚 {symbol}，单地址上限 <b>{limit}</b> 次。<br />下面填地址 → 自动检查资格 → 复制指令发给你的 AI 代理即可。",
      "hero.loading": "正在读取链上参数…",
      "prog.title": "Mint 进度",
      "prog.loading": "读取中…",
      "prog.of": "已 mint {a} / {b} 份",
      "prog.live": "进行中",
      "prog.launched": "已开盘",
      "prog.ended": "已结束",
      "prog.raised": "已募资",
      "prog.supply": "当前总供应",
      "prog.left": "剩余份数",
      "prog.deadline": "截止时间",
      "prog.done": "已停止 mint",
      "prog.cap": "{s} / 硬顶 {c}",
      "card.mint": "铸造区",
      "label.addr": "钱包地址 / .ai 名称",
      "ph.addr": "0x… 或 yourname.ai",
      "hint.addr": "填 .ai 名称（如 aveai）会自动解析成地址；也可直接填 0x 地址",
      "label.tokenId": "Agent ID 编号（选填）",
      "ph.tokenId": "例如 1234",
      "label.count": "铸造次数",
      "hint.count": "实际可 mint 次数受合约单地址上限约束，点「检查资格」看剩余额度",
      "adv.summary": "高级：合约 / 代币参数",
      "label.contract": "合约地址", "label.usdt": "USDT 合约", "label.nft": "Agent ID NFT",
      "btn.check": "检查资格", "btn.gen": "生成 AI 指令",
      "card.cmd": "AI 指令", "btn.copy": "复制",
      "ph.cmd": "填好地址后点「生成 AI 指令」，这里会出现可直接粘贴给 AI 代理的完整指令",
      "hint.cmd": "把这段指令粘到 Agentic Wallet 的 AI 对话里，它会逐步 preview 并等你确认。",
      "card.steps": "让 AI 代理帮你铸造",
      "s1.h": "开启开发者模式", "s1.p1": "在币安 App 中，为你的 Agentic Wallet 开启开发者模式。",
      "s1.p2": "Agentic Wallet → 设置 → 开发者模式",
      "s2.h": "检查资格", "s2.p1": "在上方铸造区输入你的 .ai 名称。这个地址需要有：",
      "s2.l1": "Agent ID", "s2.l2": "每次", "s2.l2b": "USDT", "s2.l3": "少量 BNB 付手续费",
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
      "el.nft": "Agent ID 持有 {n} 个", "el.nftBad": "需要持有才能 mint",
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
      "t.noWallet": "未检测到钱包，正在跳转币安登录",
      "t.connectFail": "连接失败",
      "t.redirecting": "正在跳转币安登录…",
      "t.wrongChain": "请切换到 BSC 主网（Chain ID 56）",
      "t.approving": "正在授权 USDT…",
      "t.approveOk": "授权成功",
      "t.minting": "铸造交易已提交，等待确认…",
      "t.mintOk": "铸造成功",
      "t.mintFail": "铸造失败",
      "t.genFirst": "请先生成指令",
      "t.genCopied": "指令已复制，发给你的 AI 代理即可",
      "ai.title": "用币安 AI 钱包（Agentic Wallet）铸造",
      "ai.s1": "本页填地址 → 选份数 → 点「生成 AI 指令」，指令会<b>自动复制</b>。",
      "ai.s2": "把指令发给你自己的 AI 代理（需已安装币安 Agentic Wallet 的 <code>baw</code> CLI 并开启 devMode）。",
      "ai.s3": "代理会用你的 AI 钱包完成 approve + mint，每笔都会先 preview 并等你确认。",
      "ai.note": "Agentic Wallet 是给 AI 代理用的钱包，没有网页连接接口，所以本页无法直接连接它 —— 与 jager.live 的做法一致：网页生成指令，AI 代理执行铸造。",

      "cmd.body": `我有币安 Agentic Wallet，请在 BSC（binanceChainId {chain}）上帮我铸造 {name}。
我的钱包地址：{addr}{idLine}

规则：
- 先运行 \`baw wallet settings --json\`，确认 devMode.enabled 为 true。
- 每笔交易都按「preview → 把解析结果和风险给我看 → 等我确认 → \`baw contract-call execute --requestId <这次 preview 返回的 requestId> --json\`」执行。
- gas 预估加 20%。
- 上一笔在链上确认成功后，再开始下一笔。
- 任何一步 preview 报错或被拦截，就停下告诉我，不要改参数重试。

第 1 笔：给 mint 合约授权 {amountText} USDT（授权额度已够可跳过；按 1.02 倍给）
  合约（USDT）: {uAddr}
  approve(spender = {cAddr}, amount = {amountText} USDT)
  调用数据: {approveData}
  baw contract-call preview --binanceChainId {chain} --from {addr} --to {uAddr} --inputData {approveData} --json

第 2 笔：调用 mint 合约的 mint(uint256 shares, address referrer, uint256 maxCost)，一次买 {count} 份
  shares   = {count}
  referrer = 0x0000000000000000000000000000000000000000（无推荐人）
  maxCost  = {amountText} USDT（实际花费 {costText} USDT，按 1.02 倍设上限）
  合约: {cAddr}
  调用数据: {mintData}
  baw contract-call preview --binanceChainId {chain} --from {addr} --to {cAddr} --inputData {mintData} --json

本次共 {count} 份 = {costText} USDT，预计得到 {totalText} {name}（每份 {priceText} USDT 换 {perMint} {name}）。
注意：绝不能直接把 USDT 转到 mint 合约，必须 approve 后调用 mint；只有 {cAddr} 收款。`,
    },

    en: {
      "brand.sub": "Agent ID exclusive mint · BSC",
      "btn.connect": "Connect Binance Wallet",
      "btn.walletMint": "Mint now",
      "wc.hint": "Connect the Binance wallet that holds your .ai Agent ID to mint directly on this page (approve + mint)",
      "wc.title": "Agent Wallet",
      "wc.tip": "Connect Binance Agent Wallet to read the .ai Agent ID on this wallet.",
      "wc.badgeConnecting": "Connecting",
      "wc.badgeOk": "Connected",
      "wc.pairLabel": "Pairing code",
      "wc.pairTip": "Scan with the Binance App, then check that the pairing code matches before confirming.",
      "wc.afterConfirm": "After you confirm, this page switches to your wallet.",
      "wc.waiting": "Waiting for the Binance App",
      "wc.regular": "Use a regular wallet",
      "wc.noInjected": "No browser wallet detected",
      "wc.openApp": "Open Binance sign-in",
      "wc.cancel": "Cancel connection",
      "wc.notBinance": "A non-Binance wallet (e.g. MetaMask) was detected. This page only connects to Binance Wallet: open this site inside the Binance App, install the Binance Wallet extension, or use the QR option.",
      "wc.scanMode": "No Binance Wallet detected: pressing \"Mint now\" shows a QR code — scan it with the Binance App and the mint completes automatically.",
      "wc.copyLink": "Copy page URL",
      "wc.copyLinkOk": "URL copied — open it inside the Binance App to connect your wallet and mint",
      "wc.qrReady": "QR code ready — scan it with the Binance App to approve",
      "wc.slowHint": "The connection service is not responding: most likely this domain is not in Allowed origins in the Reown dashboard, or the network is blocked. You can also copy the page URL and open it inside the Binance App.",
      "wc.noWay": "No Binance Wallet found and QR connection unavailable. Open this site inside the Binance App (Web3 Wallet → Discover → paste URL), or use \"Generate AI command\" and let your AI agent mint for you.",
      "wc.connectingFirst": "Connecting Binance Wallet…",
      "wc.needId": "WalletConnect projectId not configured — QR connect unavailable",
      "wc.pidSaved": "projectId saved",
      "wc.connecting": "Connecting…",
      "wc.connected": "Wallet connected",
      "wc.needConnect": "Connect your Binance wallet first (top right)",
      "wc.needInfo": "On-chain params not loaded yet, please retry",
      "tx.mint": "Mint tx",
      "tx.approve": "Approve tx",
      "tx.gas": "gas",
      "cmd.body.legacy": `I have a Binance Agentic Wallet. Please mint {name} for me on BSC (binanceChainId {chain}).
My wallet address: {addr}{idLine}

Rules:
- First run \`baw wallet settings --json\` and confirm devMode.enabled is true.
- For every transaction: preview → show me the parsed result and risks → wait for my confirmation → \`baw contract-call execute --requestId <requestId from that preview> --json\`.
- Add 20% to the gas estimate.
- Only start the next transaction after the previous one is confirmed on chain.
- If any preview errors out or gets blocked, stop and tell me. Do not retry with changed parameters.

Tx 1: approve {amountText} USDT to the {name} contract (skip if allowance is already enough; 1.02x buffer)
  USDT contract: {uAddr}
  approve(spender = {cAddr}, amount = {amountText} USDT)
  Input data: {approveData}
  baw contract-call preview --binanceChainId {chain} --from {addr} --to {uAddr} --inputData {approveData} --json

{tail}: call mint() on the {name} contract, {count} tx total, each with its own preview + execute, {priceText} USDT for {perMint} {name} per mint
  Contract: {cAddr}
  Input data: {mintData}
  baw contract-call preview --binanceChainId {chain} --from {addr} --to {cAddr} --inputData {mintData} --json

Total: {count} shares = {costText} USDT, expected {totalText} {name}.
Important: never transfer USDT directly to the mint contract. Always approve then call mint. {cAddr} is the only address that accepts payment.`,
      "hero.title": "Only Binance <em>Agent ID</em> holders can mint",
      "hero.sub": "Each mint costs <b>{price}</b> USDT for <b>{perMint}</b> {symbol}, max <b>{limit}</b> per wallet.<br />Enter your address → auto-check eligibility → copy the command to your AI agent.",
      "hero.loading": "Loading on-chain parameters…",
      "prog.title": "Mint progress",
      "prog.loading": "Loading…",
      "prog.of": "{a} / {b} mints",
      "prog.live": "Live",
      "prog.launched": "Launched",
      "prog.ended": "Ended",
      "prog.raised": "Raised",
      "prog.supply": "Current supply",
      "prog.left": "Remaining",
      "prog.deadline": "Deadline",
      "prog.done": "Mint closed",
      "prog.cap": "{s} / cap {c}",
      "card.mint": "Mint",
      "label.addr": "Wallet address / .ai name",
      "ph.addr": "0x… or yourname.ai",
      "hint.addr": "A .ai name (e.g. aveai) is resolved to an address automatically; a 0x address also works",
      "label.tokenId": "Agent ID number (optional)",
      "ph.tokenId": "e.g. 1234",
      "label.count": "Mint count",
      "hint.count": "The actual limit is set by the contract's per-wallet cap — click Check to see your remaining quota",
      "adv.summary": "Advanced: contract / token params",
      "label.contract": "Contract", "label.usdt": "USDT contract", "label.nft": "Agent ID NFT",
      "btn.check": "Check eligibility", "btn.gen": "Generate command",
      "card.cmd": "AI command", "btn.copy": "Copy",
      "ph.cmd": "Fill in your address and click Generate — the full command for your AI agent appears here",
      "hint.cmd": "Paste it into your Agentic Wallet AI chat. It previews every step and waits for your confirmation.",
      "card.steps": "Let Your AI Agent Mint For You",
      "s1.h": "Enable Developer Mode", "s1.p1": "In the Binance App, enable Developer Mode for your Agentic Wallet.",
      "s1.p2": "Agentic Wallet → Settings → Developer Mode",
      "s2.h": "Check eligibility", "s2.p1": "Enter your .ai name in the mint box above. This address needs:",
      "s2.l1": "Agent ID", "s2.l2": "per mint", "s2.l2b": "USDT", "s2.l3": "A little BNB for gas",
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
      "el.nft": "Agent ID held: {n}", "el.nftBad": "You must hold one to mint",
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
      "t.noWallet": "No wallet detected, redirecting to Binance login",
      "t.connectFail": "Connection failed",
      "t.redirecting": "Redirecting to Binance login…",
      "t.wrongChain": "Please switch to BSC mainnet (Chain ID 56)",
      "t.approving": "Approving USDT…",
      "t.approveOk": "Approval confirmed",
      "t.minting": "Mint transaction submitted, waiting…",
      "t.mintOk": "Mint succeeded",
      "t.mintFail": "Mint failed",
      "t.genFirst": "Generate the command first",
      "t.genCopied": "Command copied — paste it to your AI agent",
      "ai.title": "Mint with Binance Agentic Wallet (AI wallet)",
      "ai.s1": "Enter your address → pick the share count → press \"Generate AI command\" — it is <b>copied automatically</b>.",
      "ai.s2": "Send the command to your own AI agent (Binance Agentic Wallet <code>baw</code> CLI installed, devMode enabled).",
      "ai.s3": "The agent approves and mints with your AI wallet, previewing every transaction and waiting for your confirmation.",
      "ai.note": "Agentic Wallet is a wallet for AI agents — it has no web connection interface, so this page cannot connect to it directly. Same approach as jager.live: the page builds the command, the AI agent executes the mint.",

      "cmd.body": `I have a Binance Agentic Wallet. Please mint {name} for me on BSC (binanceChainId {chain}).
My wallet address: {addr}{idLine}

Rules:
- First run \`baw wallet settings --json\` and confirm devMode.enabled is true.
- For every transaction: preview → show me the parsed result and risks → wait for my confirmation → \`baw contract-call execute --requestId <requestId from that preview> --json\`.
- Add 20% to the gas estimate.
- Only start the next transaction after the previous one is confirmed on chain.
- If any preview errors out or gets blocked, stop and tell me. Do not retry with changed parameters.

Tx 1: approve {amountText} USDT to the mint contract (skip if allowance is already enough; 1.02x buffer)
  USDT contract: {uAddr}
  approve(spender = {cAddr}, amount = {amountText} USDT)
  Input data: {approveData}
  baw contract-call preview --binanceChainId {chain} --from {addr} --to {uAddr} --inputData {approveData} --json

Tx 2: call mint(uint256 shares, address referrer, uint256 maxCost) on the mint contract — {count} shares in ONE transaction
  shares   = {count}
  referrer = 0x0000000000000000000000000000000000000000 (no referrer)
  maxCost  = {amountText} USDT (actual cost {costText} USDT; 1.02x cap)
  Contract: {cAddr}
  Input data: {mintData}
  baw contract-call preview --binanceChainId {chain} --from {addr} --to {cAddr} --inputData {mintData} --json

Total: {count} shares = {costText} USDT, expected {totalText} {name} ({priceText} USDT for {perMint} {name} per share).
Important: never transfer USDT directly to the mint contract. Always approve then call mint. {cAddr} is the only address that accepts payment.`,
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

  // 铸造次数 1~10
  function buildCountOptions() {
    const sel = $("count");
    const keep = sel.value || "1";
    sel.innerHTML = "";
    for (let i = 1; i <= 10; i++) {
      const o = document.createElement("option");
      o.value = String(i);
      o.textContent = LANG === "zh" ? `${i} 次` : `${i} time${i > 1 ? "s" : ""}`;
      sel.appendChild(o);
    }
    sel.value = keep;
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
    buildCountOptions();
    paintHero();
    updateProgress();
    renderRows();
    if ($("cmd").value && resolved) $("cmd").value = buildCommand() || $("cmd").value;
  }

  let provider = null;
  let info = null;
  let account = null;
  let walletProvider = null; // 连上的钱包（注入的或 WalletConnect）
  let wcProvider = null;
  let lastCheck = null;
  let resolved = null; // { addr, name }

  function shortAddr(a) {
    return a.slice(0, 6) + "..." + a.slice(-4);
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
        "function usdtRaised() view returns (uint256)",
        "function totalSupply() view returns (uint256)",
        "function MAX_SUPPLY() view returns (uint256)",
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

    // 旧版合约可能没有 MAX_SUPPLY / usdtRaised，容错处理
    const [usdtRaised, totalSupply, maxSupply] = await Promise.all([
      c.usdtRaised().catch(() => price * mintCount),
      c.totalSupply().catch(() => mintCount * perMint),
      c.MAX_SUPPLY().catch(() => 0n),
    ]);

    // 探测合约版本：含新选择器 0x836a1040 说明是 shares 版，否则是旧的无参 mint()
    const code = await provider.getCode(await c.getAddress()).catch(() => "0x");
    const mintVer = code && code.includes("836a1040") ? "shares" : "single";

    info = { c, u, contract: await c.getAddress(), name, symbol, price, perMint, maxPerWallet, maxMints, mintCount, deadline, launched, usdtDec, nft, usdtRaised, totalSupply, maxSupply, mintVer };

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
    updateProgress();
    return info;
  }

  /* ---------- Mint 进度 ---------- */

  function updateProgress() {
    if (!info) return;
    const { mintCount, maxMints, usdtRaised, totalSupply, maxSupply, price, deadline, launched, symbol, usdtDec } = info;
    const pct = maxMints > 0n ? Number((mintCount * 1000n) / maxMints) / 10 : 0;
    const left = maxMints > mintCount ? maxMints - mintCount : 0n;
    const now = BigInt(Math.floor(Date.now() / 1000));

    let cls = "live", txt = t("prog.live");
    if (launched) { cls = "launched"; txt = t("prog.launched"); }
    else if (now > deadline) { cls = "ended"; txt = t("prog.ended"); }

    $("prog_bar").style.width = Math.min(100, pct) + "%";
    $("prog_pct").textContent = pct.toFixed(1) + "%";
    $("prog_of").textContent = t("prog.of", { a: String(mintCount), b: String(maxMints) });
    $("prog_status").textContent = txt;
    $("prog_status").className = "status " + cls;
    $("prog_raised").textContent = Number(ethers.formatUnits(usdtRaised, usdtDec)).toLocaleString("en-US") + " USDT";
    const supplyTxt = Number(ethers.formatUnits(totalSupply, 18)).toLocaleString("en-US") + " " + symbol;
    $("prog_supply").textContent = maxSupply > 0n
      ? t("prog.cap", { s: supplyTxt, c: Number(ethers.formatUnits(maxSupply, 18)).toLocaleString("en-US") })
      : supplyTxt;
    $("prog_left").textContent = String(left);
    $("prog_deadline").textContent = launched
      ? t("prog.done")
      : new Date(Number(deadline) * 1000).toLocaleString(LANG === "zh" ? "zh-CN" : "en-US", { hour12: false });
  }

  /* ---------- 资格检查 ---------- */

  function row(ok, label, extra) {
    return `<div class="row ${ok ? "ok" : "bad"}"><i>${ok ? "✓" : "✗"}</i><b>${label}</b><span>${extra || ""}</span></div>`;
  }

  function renderRows() {
    if (!lastCheck) return;
    const d = lastCheck;
    const rows = [
      row(true, t("el.addr"), d.a),
      ...(d.name ? [row(true, t("el.name", { n: d.name }), t("el.resolved"))] : []),
      row(Number(d.nftBal) > 0, t("el.nft", { n: String(d.nftBal) }), Number(d.nftBal) > 0 ? "" : t("el.nftBad")),
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
      const count = Number($("count").value);
      const need = i.price * BigInt(count);
      const nft = new ethers.Contract(i.nft, ["function balanceOf(address) view returns (uint256)"], provider);

      const [nftBal, usdtBal, bnb, minted, allowance] = await Promise.all([
        nft.balanceOf(a), i.u.balanceOf(a), provider.getBalance(a), i.c.mintedBy(a), i.u.allowance(a, i.contract),
      ]);

      const fmtU = (v) => Number(ethers.formatUnits(v, Number(i.usdtDec))).toLocaleString("en-US", { maximumFractionDigits: 6 });
      lastCheck = {
        a, name: r.name, count, need, nftBal, usdtBal, bnb, minted, allowance, fmtU,
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

  function buildCommand() {
    const a = resolved && resolved.addr;
    if (!a) {
      toast(t("t.needAddr"), "err");
      return null;
    }
    const count = Number($("count").value);
    const cAddr = ethers.getAddress($("contract").value.trim());
    const uAddr = ethers.getAddress($("usdt").value.trim());
    const dec = info ? Number(info.usdtDec) : 18;
    const price = info ? BigInt(info.price) : ethers.parseUnits("0.01", dec);
    const perMint = info ? Number(ethers.formatUnits(info.perMint, 18)).toLocaleString("en-US") : "21,000";
    const shares = BigInt(count);
    const cost = price * shares; // 实际花费
    const maxCost = (cost * 102n) / 100n; // 授权与 maxCost 都按 1.02 倍，防插队 / 价格波动
    const amountText = Number(ethers.formatUnits(maxCost, dec)).toLocaleString("en-US", { maximumFractionDigits: 6 });
    const costText = Number(ethers.formatUnits(cost, dec)).toLocaleString("en-US", { maximumFractionDigits: 6 });
    const priceText = Number(ethers.formatUnits(price, dec)).toLocaleString("en-US", { maximumFractionDigits: 6 });
    const name = info && info.name ? info.name : "Agent AI";
    const totalText = Number(ethers.formatUnits(BigInt(info ? info.perMint : 0n) * shares, 18)).toLocaleString("en-US");

    const ver = info ? info.mintVer : "shares"; // 旧合约（无参 mint）走兼容分支

    // approve(mint 合约, maxCost)
    const approveData = "0x095ea7b3" + ethers.AbiCoder.defaultAbiCoder().encode(["address", "uint256"], [cAddr, maxCost]).slice(2);
    // 新版：mint(shares, referrer, maxCost) 一次交易买 count 份；旧版：无参 mint()，每笔 1 份
    const mintData = ver === "shares"
      ? MINT_SIG + ethers.AbiCoder.defaultAbiCoder()
        .encode(["uint256", "address", "uint256"], [shares, ethers.ZeroAddress, maxCost]).slice(2)
      : MINT_SIG_LEGACY;

    const tid = $("tokenId").value.trim();
    const ids = [];
    if (resolved && resolved.name) ids.push(`${LANG === "zh" ? "我的 Agent ID 名称" : "My Agent ID name"}: ${resolved.name}`);
    if (tid) ids.push(`${LANG === "zh" ? "我的 Agent ID 编号" : "My Agent ID number"}: #${tid}`);
    const idLine = ids.length ? "\n" + ids.join("\n") : "";
    const vars = {
      chain: String(CHAIN_ID), addr: a, idLine, amountText, uAddr, approveData,
      cAddr, mintData, mintSig: MINT_SIG, count: String(count), priceText,
      costText, totalText, perMint, name,
    };

    if (ver === "single") {
      const tail = count > 1
        ? LANG === "zh" ? `第 2～${count + 1} 笔` : `Tx 2-${count + 1}`
        : LANG === "zh" ? "第 2 笔" : "Tx 2";
      return t("cmd.body.legacy", Object.assign(vars, { tail }));
    }

    return t("cmd.body", vars);
  }

  async function generate() {
    try {
      await loadInfo();
    } catch {}
    if (!(await ensureResolved())) return;
    const cmd = buildCommand();
    if (!cmd) return;
    $("cmd").value = cmd;
    // 生成即复制：用户只要粘给自己的 AI 代理（baw CLI）就行
    try {
      await navigator.clipboard.writeText(cmd);
      toast(t("t.genCopied"), "ok");
    } catch {
      $("cmd").select();
      toast(t("t.genOk"), "ok");
    }
  }

  /* ---------- 连接币安钱包 ---------- */

  // 币安登录页；return_to 用 base64 编码当前页面，登录后自动跳回
  const BINANCE_LOGIN = "https://accounts.binance.com/en/login";

  // WalletConnect projectId：页面里填的优先（存本机），没填就用下面这个默认值
  const WC_PID_KEY = "agt_wc_pid";
  const DEFAULT_WC_PID = "d1d20d01deca8b04d0c243954db38bd8";
  function wcProjectId() {
    return (localStorage.getItem(WC_PID_KEY) || DEFAULT_WC_PID).trim();
  }

  function binanceLoginUrl() {
    let back = "";
    try {
      back = btoa(location.href);
    } catch {}
    return back ? `${BINANCE_LOGIN}?return_to=${encodeURIComponent(back)}` : BINANCE_LOGIN;
  }

  /* 只认币安钱包，与 jager.live 的检测方式完全一致：
     ① EIP-6963 公告里 rdns 含 "binance" 的 provider（最规范，能同时装多个钱包也不混淆）
     ② window.ethereum.isBinance / window.BinanceChain（币安钱包插件）
     ③ window.binancew3w.ethereum（币安 App 内置浏览器）
     小狐狸等其他钱包一律不用，避免点了「连接币安钱包」却弹 MetaMask。 */
  const eip6963 = [];
  window.addEventListener("eip6963:announceProvider", (e) => {
    if (e && e.detail && e.detail.info && e.detail.provider) eip6963.push(e.detail);
  });

  function injectedWallet() {
    const binance = eip6963.filter((d) => String((d.info && d.info.rdns) || "").toLowerCase().includes("binance"));
    if (binance.length) return binance[0].provider;
    const e = window.ethereum;
    if (e && (e.isBinance || e.isBinanceWeb3Wallet || e.isBinanceW3W)) return e;
    if (window.BinanceChain) return window.BinanceChain;
    if (window.binancew3w && window.binancew3w.ethereum) return window.binancew3w.ethereum;
    return null;
  }

  async function connect() {
    const w = injectedWallet();
    if (w) {
      connMsg(t("wc.connecting"));
      try {
        const accs = await w.request({ method: "eth_requestAccounts" });
        walletProvider = w;
        setAccount(accs[0]);
        connMsg(t("wc.connected") + " " + shortAddr(accs[0]));
        toast(t("t.walletOk"), "ok");
        check(); // 连上后直接检查资格
      } catch (e) {
        connMsg(t("t.connectFail") + "：" + ((e && (e.shortMessage || e.message)) || ""), true);
        toast(e.message || t("t.connectFail"), "err");
      }
      return;
    }

    // 浏览器里没有钱包 → WalletConnect v2 扫码连币安 App
    const W = window.WCMint;
    if (W && W.EthereumProvider) {
      const pid = wcProjectId();
      if (!pid) {
        connMsg(t("wc.needId"), true);
        toast(t("wc.needId"), "err");
        return;
      }
      try {
        connMsg(t("wc.connecting"));
        toast(t("wc.connecting"));
        // 8 秒还没拿到二维码，多半是 Reown 后台没登记域名（Allowed origins）
        const slow = setTimeout(() => connMsg(t("wc.slowHint"), true), 8000);
        const clearSlow = () => clearTimeout(slow);
        wcProvider = await W.EthereumProvider.init({
          projectId: pid,
          chains: [CHAIN_ID],
          optionalChains: [CHAIN_ID],
          showQrModal: false,
          methods: ["eth_sendTransaction", "eth_requestAccounts", "eth_accounts", "eth_chainId", "wallet_switchEthereumChain"],
          events: ["chainChanged", "accountsChanged"],
        });
        wcProvider.on("display_uri", (uri) => {
          clearSlow();
          showQr(uri);
        });
        const accs = await wcProvider.request({ method: "eth_requestAccounts" });
        clearSlow();
        closeQr();
        const badge = $("awBadge");
        if (badge) {
          badge.textContent = t("wc.badgeOk");
          badge.classList.add("ok");
        }
        walletProvider = wcProvider;
        setAccount(accs[0]);
        connMsg(t("wc.connected") + " " + shortAddr(accs[0]));
        toast(t("wc.connected"), "ok");
        check();
      } catch (e) {
        clearSlow();
        closeQr();
        const msg = (e && (e.shortMessage || e.message)) || t("t.connectFail");
        connMsg(t("t.connectFail") + "：" + msg, true);
        toast(msg, "err");
      }
      return;
    }

    // 都没有 → 提示改用币安 App 内打开（交易所登录页连不到钱包，不再误导用户跳转）
    connMsg(t("wc.noWay"), true);
    toast(t("wc.noWay"), "err");
  }

  // 连接状态常驻显示（失败原因不再是一闪而过的 toast）
  function connMsg(text, isErr) {
    const el = $("connMsg");
    if (!el) return;
    el.innerHTML = text ? `<span class="${isErr ? "err" : ""}">${text}</span>` : "";
  }

  function setAccount(addr) {
    account = addr;
    if ($("addr")) $("addr").value = addr;
    resolved = { addr, name: null };
    const cb = $("connectBtn");
    if (cb) cb.textContent = shortAddr(addr);
  }

  let lastUri = ""; // 最近一次 WC 连接串，用于「打开币安 App」按钮

  function wcOpenUrl(uri) {
    return "https://walletconnect.com/wc?uri=" + encodeURIComponent(uri);
  }

  function showQr(uri) {
    lastUri = uri;
    const box = $("qrBox");
    if (box && window.WCMint) {
      try {
        box.innerHTML = window.WCMint.qrSvg(uri);
      } catch {
        box.textContent = uri; // 二维码渲染失败也把连接串露出来
      }
    }
    const open = $("wcOpen");
    if (open) open.href = wcOpenUrl(uri);
    const m = $("qrModal");
    if (m) m.classList.remove("hidden");
    // 配对码（jager 同款）：取 WC 会话 topic 前 6 位，币安 App 端会显示同样的码供比对
    const tm = String(uri).match(/^wc:([0-9a-fA-F]+)@/);
    const pair = $("awPair");
    if (pair) pair.textContent = tm ? tm[1].slice(0, 6).toUpperCase() : "——";
    const badge = $("awBadge");
    if (badge) {
      badge.textContent = t("wc.badgeConnecting");
      badge.classList.remove("ok");
    }
    connMsg(t("wc.qrReady"));
    startWaitTimer();
    // 手机浏览器：自动开新标签唤起币安 App 授权（不卸载本页，连接状态才不会丢）
    if (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) {
      try {
        window.open(wcOpenUrl(uri), "_blank");
      } catch {}
    }
  }

  // 「正在等待币安 App · Ns」计时器（对齐 jager）
  let waitTimer = null;
  let waitStart = 0;

  function startWaitTimer() {
    stopWaitTimer();
    waitStart = Date.now();
    const el = $("awWait");
    if (!el) return;
    const tick = () => {
      el.textContent = `${t("wc.waiting")} · ${Math.floor((Date.now() - waitStart) / 1000)}s`;
    };
    tick();
    waitTimer = setInterval(tick, 1000);
  }

  function stopWaitTimer() {
    if (waitTimer) {
      clearInterval(waitTimer);
      waitTimer = null;
    }
    const el = $("awWait");
    if (el) el.textContent = "";
  }

  function closeQr() {
    const m = $("qrModal");
    if (m) m.classList.add("hidden");
    stopWaitTimer();
  }

  /* ---------- 网页直接铸造（钱包签名） ---------- */

  async function mintWithWallet() {
    const wtx0 = $("wtx");
    // 失败原因不只弹 toast，也写在按钮下方，避免"点了没反应"
    const fail = (msg) => {
      toast(msg, "err");
      if (wtx0) wtx0.innerHTML = `<span class="err">${msg}</span>`;
    };

    // 没连钱包就先连（弹二维码 / 唤起币安 App），连上后自动接着铸造 —— 点一次就行
    if (!walletProvider) {
      toast(t("wc.connectingFirst"));
      await connect();
      if (!walletProvider) return fail(t("wc.needConnect"));
    }
    if (!info) {
      try {
        await loadInfo();
      } catch (e) {
        return fail(t("wc.needInfo"));
      }
    }
    if (!info) return fail(t("wc.needInfo"));

    const bp = new ethers.BrowserProvider(walletProvider);
    const net = await bp.getNetwork();
    if (Number(net.chainId) !== CHAIN_ID) return fail(t("t.wrongChain"));

    const signer = await bp.getSigner();
    const from = await signer.getAddress();
    const shares = BigInt($("count").value || "1");
    const cost = BigInt(info.price) * shares;
    const maxCost = (cost * 102n) / 100n; // 与 AI 指令一致：1.02 倍
    const cAddr = ethers.getAddress($("contract").value.trim());
    const uAddr = ethers.getAddress($("usdt").value.trim());
    const wtx = $("wtx");

    try {
      // 1) 授权（额度够就跳过）
      const u = new ethers.Contract(uAddr, ["function allowance(address,address) view returns (uint256)"], bp);
      const allowance = await u.allowance(from, cAddr);
      if (allowance < maxCost) {
        toast(t("t.approving"));
        const tx1 = await signer.sendTransaction({
          to: uAddr,
          data: "0x095ea7b3" + ethers.AbiCoder.defaultAbiCoder().encode(["address", "uint256"], [cAddr, maxCost]).slice(2),
        });
        await tx1.wait();
        toast(t("t.approveOk"), "ok");
        if (wtx) wtx.innerHTML = txLink(t("tx.approve"), tx1.hash);
      }

      // 2) 铸造（新版一笔买完；旧版无参 mint()，每笔 1 份，逐笔发）
      toast(t("t.minting"));
      const ver = info.mintVer === "shares" ? "shares" : "single";
      const newData = MINT_SIG + ethers.AbiCoder.defaultAbiCoder()
        .encode(["uint256", "address", "uint256"], [shares, ethers.ZeroAddress, maxCost]).slice(2);
      const times = ver === "shares" ? 1 : Number(shares);
      const hashes = [];
      let gasUsed = 0n;
      for (let i = 0; i < times; i++) {
        if (i > 0) toast(`${t("t.minting")} (${i + 1}/${times})`);
        const tx2 = await signer.sendTransaction({ to: cAddr, data: ver === "shares" ? newData : MINT_SIG_LEGACY });
        const rc = await tx2.wait();
        hashes.push(tx2.hash);
        gasUsed += rc.gasUsed;
      }
      toast(t("t.mintOk"), "ok");
      if (wtx)
        wtx.innerHTML = hashes
          .map((h, i) => txLink(times > 1 ? `${t("tx.mint")} ${i + 1}` : t("tx.mint"), h))
          .join(" · ") + ` · ${t("tx.gas")}: ${gasUsed}`;
      loadInfo().catch(() => {});
    } catch (e) {
      fail(e.shortMessage || e.reason || e.message || t("t.mintFail"));
    }
  }

  function txLink(label, hash) {
    return `<a href="https://bscscan.com/tx/${hash}" target="_blank" rel="noopener">${label} ${shortAddr(hash)}</a>`;
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

  // 按钮可能不存在（老页面），加个空判断避免整个脚本挂掉
  const _connectBtn = $("connectBtn");
  if (_connectBtn) _connectBtn.addEventListener("click", connect);
  if ($("walletMintBtn")) $("walletMintBtn").addEventListener("click", mintWithWallet);

  // 环境提示：告诉用户当前浏览器能不能直接连币安钱包
  (function envHint() {
    const eg = window.ethereum;
    const hasBinance =
      !!injectedWallet() ||
      !!(eg && (eg.isBinance || eg.isBinanceWeb3Wallet || eg.isBinanceW3W)) ||
      !!window.BinanceChain ||
      !!(window.binancew3w && window.binancew3w.ethereum);
    const other = !!eg && !hasBinance;
    const h1 = $("hintNoBinance");
    const h2 = $("hintScan");
    if (h1) h1.classList.toggle("hidden", !other);
    if (h2) h2.classList.toggle("hidden", hasBinance || other);
  })();

  // 复制本站网址，方便粘到币安 App 里打开（App 内即可直接连钱包铸造）
  if ($("copyLinkBtn"))
    $("copyLinkBtn").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(location.href);
        toast(t("wc.copyLinkOk"), "ok");
      } catch {
        toast(location.href, "ok");
      }
    });

  // 让已安装的钱包通过 EIP-6963 主动上报，稍后 connect() 才能找到它
  try {
    window.dispatchEvent(new Event("eip6963:requestProvider"));
  } catch {}

  // WalletConnect projectId：填一次存本机
  if ($("wcPid")) {
    $("wcPid").value = wcProjectId();
    $("wcPid").addEventListener("change", () => {
      localStorage.setItem(WC_PID_KEY, $("wcPid").value.trim());
      toast(t("wc.pidSaved"), "ok");
    });
  }
  if ($("qrClose")) $("qrClose").addEventListener("click", closeQr);
  if ($("qrCancel")) $("qrCancel").addEventListener("click", closeQr);
  if ($("qrRegular"))
    $("qrRegular").addEventListener("click", () => {
      closeQr();
      const w = injectedWallet();
      if (w) connect();
      else toast(t("wc.noInjected"), "err");
    });
  if ($("wcOpen"))
    $("wcOpen").addEventListener("click", (e) => {
      if (!lastUri) {
        e.preventDefault();
        toast(t("wc.needConnect"), "err");
      }
    });
  if ($("qrModal"))
    $("qrModal").addEventListener("click", (e) => {
      if (e.target === $("qrModal")) closeQr();
    });

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
  setInterval(() => loadInfo().catch(() => {}), 30000); // auto refresh mint progress
  applyLang(LANG);
  loadInfo().catch(() => {
    // 读不到链上参数时退回默认值，避免一直显示"读取中"
    heroReady = true;
    paintHero();
  });
})();
