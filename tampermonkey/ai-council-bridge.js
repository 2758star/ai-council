// ==UserScript==
// @name         AI Council Bridge
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Bridge between AI Council app and AI web pages
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @match        https://claude.ai/*
// @match        https://gemini.google.com/*
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  // 检测当前是哪个 provider
  function detectProvider() {
    const host = window.location.hostname;
    if (host.includes('openai') || host.includes('chatgpt')) return 'chatgpt';
    if (host.includes('claude')) return 'claude';
    if (host.includes('gemini')) return 'gemini';
    return null;
  }

  const provider = detectProvider();
  if (!provider) return;

  // Provider Adapter：每个平台的 DOM 操作
  const adapters = {
    chatgpt: {
      getInput: () => document.querySelector('#prompt-textarea'),
      getSendBtn: () => document.querySelector('[data-testid="send-button"]'),
      getLatestReply: () => {
        const msgs = document.querySelectorAll('[data-message-author-role="assistant"]');
        return msgs.length ? msgs[msgs.length - 1].innerText : null;
      },
      isStreaming: () => !!document.querySelector('[data-testid="stop-button"]'),
    },
    claude: {
      getInput: () => document.querySelector('.ProseMirror'),
      getSendBtn: () => document.querySelector('[aria-label="Send message"]'),
      getLatestReply: () => {
        const msgs = document.querySelectorAll('.font-claude-message');
        return msgs.length ? msgs[msgs.length - 1].innerText : null;
      },
      isStreaming: () => !!document.querySelector('[aria-label="Stop"]'),
    },
    gemini: {
      getInput: () => document.querySelector('.ql-editor') || document.querySelector('rich-textarea'),
      getSendBtn: () => document.querySelector('button[aria-label="Send message"]') || document.querySelector('.send-button'),
      getLatestReply: () => {
        const msgs = document.querySelectorAll('model-response');
        return msgs.length ? msgs[msgs.length - 1].innerText : null;
      },
      isStreaming: () => !!document.querySelector('[aria-label="Stop generating"]'),
    },
  };

  const adapter = adapters[provider];

  // 模拟人类打字（稳定性节流，不是反检测）
  async function humanType(element, text) {
    element.focus();
    // 清空现有内容
    document.execCommand('selectAll');
    document.execCommand('delete');
    // 分批插入，每批 10-20 个字符，间隔 50-150ms
    const chunkSize = Math.floor(Math.random() * 10) + 10;
    for (let i = 0; i < text.length; i += chunkSize) {
      const chunk = text.slice(i, i + chunkSize);
      document.execCommand('insertText', false, chunk);
      element.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(50 + Math.random() * 100);
    }
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 等待元素出现
  async function waitForElement(fn, timeout = 10000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = fn();
      if (el) return el;
      await sleep(300);
    }
    throw new Error('Element not found');
  }

  // 发送消息
  async function sendMessage(text) {
    const input = await waitForElement(adapter.getInput);
    await humanType(input, text);
    await sleep(500 + Math.random() * 500);
    const btn = await waitForElement(adapter.getSendBtn);
    btn.click();
    return 'sent';
  }

  // 读取最新回复（等待生成完成）
  async function readLatestReply(previousReply, timeout = 60000) {
    const start = Date.now();
    // 等待开始生成
    await sleep(2000);
    // 等待生成完成
    while (Date.now() - start < timeout) {
      if (!adapter.isStreaming()) {
        const reply = adapter.getLatestReply();
        if (reply && reply !== previousReply) return reply;
      }
      await sleep(1000);
    }
    throw new Error('Response timeout');
  }

  // WebSocket 连接到 Tauri 本地服务
  let ws = null;
  let lastReply = null;

  function connect() {
    ws = new WebSocket('ws://localhost:19280');

    ws.onopen = () => {
      console.log('[AI Council Bridge] Connected');
      ws.send(JSON.stringify({ type: 'register', provider }));
    };

    ws.onmessage = async (event) => {
      let msg;
      try { msg = JSON.parse(event.data); } catch { return; }

      if (msg.type === 'send') {
        try {
          await sendMessage(msg.text);
          ws.send(JSON.stringify({ type: 'send_ack', id: msg.id, provider, status: 'ok' }));
        } catch (err) {
          ws.send(JSON.stringify({ type: 'send_ack', id: msg.id, provider, status: 'error', error: String(err) }));
        }
      }

      if (msg.type === 'read') {
        try {
          const reply = await readLatestReply(lastReply);
          lastReply = reply;
          ws.send(JSON.stringify({ type: 'read_ack', id: msg.id, provider, text: reply }));
        } catch (err) {
          ws.send(JSON.stringify({ type: 'read_ack', id: msg.id, provider, status: 'error', error: String(err) }));
        }
      }

      if (msg.type === 'status') {
        ws.send(JSON.stringify({
          type: 'status_ack',
          provider,
          isStreaming: adapter.isStreaming(),
          hasInput: !!adapter.getInput(),
        }));
      }
    };

    ws.onclose = () => {
      console.log('[AI Council Bridge] Disconnected, retrying in 3s');
      setTimeout(connect, 3000);
    };

    ws.onerror = () => ws.close();
  }

  // 页面加载完成后连接
  if (document.readyState === 'complete') {
    connect();
  } else {
    window.addEventListener('load', connect);
  }
})();
