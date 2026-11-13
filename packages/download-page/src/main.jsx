// Copyright (C) 2026 Tuzi. AGPL-3.0-or-later.
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  detectPlatform,
  defaultDownloads,
  formats,
  releasesUrl,
  validateManifest,
} from "./release.js";
import "./style.css";
import { installation } from "./install.js";

const base = import.meta.env.BASE_URL;
const source = "https://github.com/tuziapi/tuzi-magpie";
const screens = [
  [
    "account",
    "兔子账户",
    "从账户到模型，连接更顺手。",
    "连接兔子账户，管理模型 Key，并将可用 Key 添加为模型供应商。",
  ],
  [
    "models",
    "模型目录",
    "先了解模型，再做选择。",
    "浏览模型目录、协议与价格信息。模型是否可用，以你的 Key 权限为准。",
  ],
  [
    "providers",
    "服务商配置",
    "常用的模型来源，放在一起。",
    "管理服务商地址、密钥与模型列表，再为 AI 工具选择合适的模型。",
  ],
];
const platformNames = { macos: "macOS", windows: "Windows", linux: "Linux" };
const requirements = {
  macos:
    "macOS 12 或更新版本。请在「关于本机」确认 Apple 芯片或 Intel 处理器。打开 DMG，将 tuzi-magpie 拖入 Applications。",
  windows:
    "需要 Microsoft Edge WebView2 Runtime。x64 可选当前用户安装器；ARM64 使用便携 ZIP，完整解压到可写目录后运行。",
  linux:
    "面向 Ubuntu 24.04 x64 / amd64，需图形桌面、GTK 3 与 WebKitGTK 4.1。不提供 Linux ARM64 安装包。",
};
function External({ href, children, ...props }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  );
}
function InstallCommand({ platform }) {
  const installer = installation(platform);
  const [message, setMessage] = useState("");
  if (!installer) return null;
  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(installer.command);
      setMessage("安装命令已复制");
    } catch {
      setMessage("复制失败，请手动选择并复制命令。");
    }
  }
  return (
    <div className="install-command" aria-label="命令安装">
      <div className="command-heading">
        <h4>也可以用命令安装</h4>
        <span>{installer.shell}</span>
      </div>
      <div className="command-code">
        <code tabIndex={0} aria-label="安装命令">
          {installer.command}
        </code>
        <button onClick={copyCommand}>复制命令</button>
      </div>
      {message && <p role="status">{message}</p>}
      <p>
        安装最新正式版，自动识别运行命令的电脑；不受上方安装包选择影响。脚本会校验
        SHA-256，更新前请先退出 tuzi-magpie。
      </p>
      <p>{installer.note}</p>
      <External href={installer.url}>查看安装脚本 ↗</External>
    </div>
  );
}
function App() {
  const [theme, setTheme] = useState(() => {
    try {
      const stored = localStorage.getItem("tuzi-page-theme");
      return ["light", "dark", "system"].includes(stored) ? stored : "system";
    } catch {
      return "system";
    }
  });
  const [screen, setScreen] = useState(0);
  const [platform, setPlatform] = useState(() =>
    detectPlatform(
      navigator.userAgent,
      navigator.platform,
      navigator.maxTouchPoints,
    ),
  );
  const [selected, setSelected] = useState(
    () => defaultDownloads[platform] || "",
  );
  const [release, setRelease] = useState(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [copied, setCopied] = useState("");
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("tuzi-page-theme", theme);
    } catch {
      /* Storage is optional. */
    }
  }, [theme]);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let active = true;
    setRelease(null);
    setError("");
    fetch(`${base}release.json`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((r) => {
        if (!r.ok) throw Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(validateManifest)
      .then((value) => {
        if (active) setRelease(value);
      })
      .catch(() => {
        if (active)
          setError(
            "暂时无法读取已验证的下载清单，请重试，或前往正式 Releases 页面。",
          );
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [attempt]);
  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied("SHA-256 已复制");
    } catch {
      setCopied("复制失败，请手动选择下方 SHA-256 文本。");
    }
  }
  const current = release?.downloads.find((a) => a.id === selected);
  const spec = formats.find((a) => a.id === selected);
  const chosen = screens[screen];
  const [imageError, setImageError] = useState(false);
  function switchScreen(index) {
    setScreen(index);
    setImageError(false);
  }
  return (
    <>
      <a className="skip" href="#downloads">
        跳到下载区域
      </a>
      <header className="nav wrap">
        <a className="brand" href="#top" aria-label="兔子版 Magpie 首页">
          <img src={`${base}magpie.png`} alt="" />
          <span>
            tuzi<span className="brand-dot">·</span>magpie
            <small>兔子版 MAGPIE</small>
          </span>
        </a>
        <nav aria-label="主导航">
          <a href="#features">功能</a>
          <a href="#preview">界面预览</a>
          <a href="#start">快速开始</a>
          <a href="#faq">常见问题</a>
        </nav>
        <div className="nav-actions">
          <button
            className="theme"
            aria-label={`主题：${{ system: "跟随系统", light: "浅色", dark: "深色" }[theme]}，点击切换`}
            onClick={() =>
              setTheme(
                { system: "light", light: "dark", dark: "system" }[theme],
              )
            }
          >
            {theme === "dark" ? "☾" : theme === "light" ? "☀" : "◐"}
          </button>
          <External href={source} className="github">
            GitHub ↗
          </External>
          <a className="button small" href="#downloads">
            下载 <span aria-hidden="true">↓</span>
          </a>
        </div>
      </header>
      <main id="top">
        <section className="hero wrap">
          <div className="eyebrow">
            <span className="live-dot" /> 为你的 AI 工作流，少一点配置
          </div>
          <h1>
            模型一处管理，
            <br />
            <span>工具随心切换。</span>
          </h1>
          <p className="hero-copy">
            把 AI 工具、模型服务商与兔子账户连在一起。
            <br className="desktop-break" />
            在熟悉的工具里，选用适合当下任务的模型。
          </p>
          <div className="hero-actions">
            <a className="button" href="#downloads">
              下载兔子版 Magpie <span aria-hidden="true">↓</span>
            </a>
            <a className="text-link" href="#preview">
              看看它如何工作 <span aria-hidden="true">↗</span>
            </a>
          </div>
          <p className="hero-meta">
            macOS · Windows · Linux <span> / </span> 开源桌面应用
          </p>
          <div className="tool-strip" aria-label="常用 AI 工具">
            <span>与你熟悉的工具一起工作</span>
            <strong>⌘ Codex</strong>
            <strong>✳ Claude Code</strong>
            <strong>✦ Gemini CLI</strong>
            <strong>▣ OpenCode</strong>
          </div>
        </section>
        <section
          className="showcase wrap"
          id="preview"
          aria-label="产品界面预览"
        >
          <div className="screen-top">
            <div className="segmented" role="group" aria-label="选择界面预览">
              {screens.map(([id, title], i) => (
                <button
                  key={id}
                  aria-pressed={screen === i}
                  onClick={() => switchScreen(i)}
                >
                  {title}
                </button>
              ))}
            </div>
            <span className="demo-label">
              <span className="live-dot" /> 真实界面 · 合成演示数据
            </span>
          </div>
          <div className="screen-image">
            {imageError ? (
              <p role="status">界面预览暂时不可用。请刷新后重试。</p>
            ) : (
              <img
                src={`${base}screenshots/${chosen[0]}.png`}
                alt={`兔子版 Magpie ${chosen[1]}真实界面，所有账户和模型数据均为合成演示`}
                width="1200"
                height="800"
                onError={() => setImageError(true)}
              />
            )}
          </div>
          <div className="screen-caption">
            <div>
              <h2>{chosen[2]}</h2>
              <p>
                {chosen[3]}{" "}
                <External href={`${base}screenshots/${chosen[0]}.png`}>
                  查看原图 ↗
                </External>
              </p>
            </div>
            <span aria-hidden="true">
              0{screen + 1}
              <small> / 03</small>
            </span>
          </div>
        </section>
        <section className="section wrap" id="features">
          <div className="section-heading">
            <div>
              <p className="eyebrow">LESS SETUP. MORE FOCUS.</p>
              <h2>
                把配置理顺，
                <br />
                让注意力回到工作。
              </h2>
            </div>
            <p>
              从模型来源到工具选择，
              <br />
              把常用操作放进一个清晰的桌面。
            </p>
          </div>
          <div className="feature-grid">
            <article>
              <span className="feature-number">01 / MANAGE</span>
              <div className="feature-symbol" aria-hidden="true">
                ⌘
              </div>
              <h3>AI 工具，各用各的模型</h3>
              <p>
                在 Agent 页面集中查看工具配置，为 Codex、Claude Code、Gemini CLI
                等工具选择模型。
              </p>
              <div className="tags">
                <span>模型切换</span>
                <span>工具配置</span>
              </div>
            </article>
            <article>
              <span className="feature-number">02 / CONNECT</span>
              <div className="feature-symbol" aria-hidden="true">
                ⇄
              </div>
              <h3>服务商与账号，有条不紊</h3>
              <p>
                添加服务商地址与 API
                Key，查看可用模型。保留手动配置的灵活性，按自己的习惯组织模型来源。
              </p>
              <div className="tags">
                <span>服务商管理</span>
                <span>模型列表</span>
              </div>
            </article>
            <article>
              <span className="feature-number">03 / TUZI</span>
              <img className="feature-mark" src={`${base}magpie.png`} alt="" />
              <h3>兔子账户，直接接入</h3>
              <p>
                连接账户后管理模型 Key、查看调用记录与模型目录，将符合条件的 Key
                添加到 Magpie。
              </p>
              <div className="tags">
                <span>账户连接</span>
                <span>Key 管理</span>
              </div>
            </article>
          </div>
        </section>
        <section className="download-section" id="downloads">
          <div className="wrap download-layout">
            <div className="download-intro">
              <p className="eyebrow">READY FOR YOUR DESKTOP</p>
              <h2>
                从你的桌面，
                <br />
                开始。
              </h2>
              <p>
                选择适合电脑的安装包。
                <br />
                浏览与下载，无需登录。
              </p>
              <p className="release-badge" aria-live="polite">
                {release
                  ? `${release.tag} · 正式版本`
                  : error
                    ? "下载清单暂不可用"
                    : "正在读取正式版本…"}
              </p>
              {release && (
                <p className="release-date">
                  发布于{" "}
                  {new Date(release.publishedAt).toLocaleDateString("zh-CN", {
                    timeZone: "Asia/Shanghai",
                  })}
                </p>
              )}
              <External
                href={release?.releaseUrl || releasesUrl}
                className="text-link"
              >
                更新说明与全部安装包 ↗
              </External>
            </div>
            <div className="download-card">
              <div className="platforms" role="group" aria-label="选择操作系统">
                {Object.entries(platformNames).map(([id, name]) => (
                  <button
                    key={id}
                    aria-pressed={platform === id}
                    onClick={() => {
                      setPlatform(id);
                      setSelected(defaultDownloads[id]);
                      setCopied("");
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
              {!platform ? (
                <p className="platform-prompt">
                  请手动选择目标电脑的操作系统。移动设备不提供安装包。
                </p>
              ) : (
                <>
                  <div className="download-title">
                    <h3>{platformNames[platform]}</h3>
                    <span>桌面版</span>
                  </div>
                  <p className="arch-hint">
                    已默认选择常用架构；请核对电脑芯片类型，需要时可切换。
                  </p>
                  <div
                    className="architectures"
                    role="group"
                    aria-label="选择架构与安装格式"
                  >
                    {formats
                      .filter((f) => f.platform === platform)
                      .map((f) => (
                        <button
                          key={f.id}
                          aria-pressed={selected === f.id}
                          onClick={() => {
                            setSelected(f.id);
                            setCopied("");
                          }}
                        >
                          {f.label}
                          <span>{f.format}</span>
                        </button>
                      ))}
                  </div>
                  <p className="requirements">{requirements[platform]}</p>
                </>
              )}
              {error ? (
                <div className="load-error" role="alert">
                  <p>{error}</p>
                  <button onClick={() => setAttempt((n) => n + 1)}>
                    重试加载
                  </button>{" "}
                  <External href={releasesUrl}>打开正式 Releases ↗</External>
                </div>
              ) : current ? (
                <>
                  <a className="button download-button" href={current.url}>
                    下载 {spec.label} · {spec.format}{" "}
                    <span aria-hidden="true">↓</span>
                  </a>
                  <div className="file-meta">
                    <span>{(current.bytes / 1048576).toFixed(1)} MB</span>
                    <span>{release.tag}</span>
                    <span>SHA-256 已核验</span>
                  </div>
                  <details className="checksum">
                    <summary>文件名与校验摘要</summary>
                    <p>{current.name}</p>
                    <code>{current.sha256}</code>
                    <button onClick={() => copy(current.sha256)}>
                      复制 SHA-256
                    </button>
                    <p role="status">{copied}</p>
                  </details>
                </>
              ) : (
                <button className="button download-button" disabled>
                  {!release
                    ? "正在读取安装包…"
                    : !platform
                      ? "请先选择操作系统"
                      : "请先选择架构与格式"}
                </button>
              )}
              <InstallCommand key={platform} platform={platform} />
              <p className="install-note">
                当前安装包没有可信开发者签名，macOS
                未公证，系统可能提示安全警告。自动更新未启用，请手动下载安装新版。
              </p>
              <External
                href={`${source}/blob/main/docs/tuzi-magpie/unsigned-install.md`}
                className="install-guide"
              >
                安装说明与系统安全提示 ↗
              </External>
            </div>
          </div>
        </section>
        <section className="section wrap" id="start">
          <p className="eyebrow">THREE SIMPLE STEPS</p>
          <h2>准备就绪，只需三步。</h2>
          <div className="steps">
            <article>
              <span>01</span>
              <h3>安装并打开</h3>
              <p>选择对应系统与芯片的安装包，按安装说明打开 tuzi-magpie。</p>
            </article>
            <article>
              <span>02</span>
              <h3>添加模型来源</h3>
              <p>
                手动添加服务商与模型 Key；或连接兔子账户，选择可用 Key
                添加为供应商。
              </p>
            </article>
            <article>
              <span>03</span>
              <h3>为工具选择模型</h3>
              <p>
                安装你要使用的 AI 工具，在 Agent
                页面完成接入并选择模型，按提示开始新会话。
              </p>
            </article>
          </div>
        </section>
        <section className="faq section wrap" id="faq">
          <div>
            <p className="eyebrow">GOOD TO KNOW</p>
            <h2>
              开始之前，
              <br />
              你可能想知道。
            </h2>
          </div>
          <div className="questions">
            {[
              [
                "需要兔子账户才能使用吗？",
                "页面浏览和下载无需登录。客户端可以手动配置服务商；使用兔子账户管理功能时，才需要连接自己的兔子账户。模型服务的权限与费用由对应服务商决定。",
              ],
              [
                "它和原版 Magpie 有什么关系？",
                "兔子版基于开源 Magpie，保留 AI 工具与模型管理能力，加入兔子账户接入。本页只提供 tuziapi/tuzi-magpie 的桌面安装包，保留上游许可与署名。",
              ],
              [
                "如何确认芯片架构？",
                "Mac 在苹果菜单的「关于本机」查看芯片：Apple 芯片选 Apple Silicon，Intel 选 Intel。Windows 在「设置 → 系统 → 系统信息」查看系统类型。Linux 仅提供 Ubuntu 24.04 amd64 DEB。",
              ],
              [
                "系统提示无法验证开发者，怎么办？",
                "此版本未提供可信开发者签名或 Apple 公证。先确认来自兔子版正式 Release，并核对 SHA-256。macOS 可按设备政策在「隐私与安全性」中选择「仍要打开」。不要全局关闭系统保护；企业设备可能禁止未签名应用。",
              ],
              [
                "如何更新？便携版的数据放在哪里？",
                "自动更新尚未启用。退出正在运行的客户端，再下载并安装新版。Windows 便携版将账户与配置保存在同目录 tuzi-magpie-data 中，升级时请保留它，不要分享使用过的便携目录。",
              ],
              [
                "演示画面里展示的是真实账户吗？",
                "不是。画面来自仓库真实界面，使用隔离的合成账户、模型与服务商数据，不含真实密钥、余额或个人信息。界面和可用模型以安装版本及实际权限为准。",
              ],
            ].map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <span aria-hidden="true">＋</span>
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="closing wrap">
          <img src={`${base}magpie.png`} alt="" />
          <h2>工具熟悉，选择自由。</h2>
          <a className="button" href="#downloads">
            找到你的安装包 ↓
          </a>
        </section>
      </main>
      <footer className="wrap">
        <div>
          <strong>tuzi·magpie</strong>
          <p>兔子版 Magpie · 让模型配置更顺手。</p>
          <small>基于 Magpie · Copyright © 2026 yetone · MIT</small>
        </div>
        <div className="footer-links">
          <External href={source}>兔子版源码 ↗</External>
          <External href={releasesUrl}>正式 Releases ↗</External>
          <External href={`${source}/tree/main/packages/download-page`}>
            页面源码 ↗
          </External>
          <a href={`${base}source.tar.gz`}>本次页面源码包 ↓</a>
          <a href={`${base}LICENSE.txt`}>页面许可 · AGPL-3.0</a>
          <a href={`${base}MAGPIE-LICENSE.txt`}>Magpie 许可 · MIT</a>
        </div>
      </footer>
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
