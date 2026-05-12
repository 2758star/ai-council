# AI Roundtable Web Mode Notes

Date: 2026-05-12

## Goal

Support a non-API "web session" mode so ChatGPT, Claude, and Gemini can discuss inside their existing logged-in web sessions without manual copy-paste.

## Important Product Truths

1. Web mode is not official cross-provider chat.
2. Each provider remains an independent web conversation.
3. Cross-model visibility happens only because our local app forwards messages.
4. If we bind one fixed thread per provider, later discussion can continue in the same web history thread.

## Recommended Session Model

- One `discussionId` in our app
- One fixed thread URL for `ChatGPT`
- One fixed thread URL for `Claude`
- One fixed thread URL for `Gemini`
- Local transcript remains the source of truth
- Web thread acts as the transport target

## Why This Matters

- User can continue one long-running group discussion
- Provider web history stays readable
- If one provider temporarily fails, the local discussion still survives

## GitHub References

### Strong references

- [agentify-sh/desktop](https://github.com/agentify-sh/desktop)
  - Local controller for logged-in AI web sessions
  - Good reference for stable tab/session control

- [browser-use/browser-use](https://github.com/browser-use/browser-use)
  - Strong browser automation foundation
  - Good if we want higher-level page control

- [dliedke/GenAIPromptExtension](https://github.com/dliedke/GenAIPromptExtension)
  - Browser extension that sends one prompt to several AI chat sites
  - Useful reference for multi-tab dispatch UX

- [xiaolai/insidebar-ai](https://github.com/xiaolai/insidebar-ai)
  - Multi-provider sidebar UI
  - Useful reference for one-place interaction design

- [cx994/ccb](https://github.com/cx994/ccb)
  - Persistent multi-model collaboration idea
  - Good reference for memory and long-running coordination

## Suggested Build Order

1. Fixed thread binding UI
2. Web session status model
3. Manual "open and verify" workflow
4. Browser driver abstraction
5. Auto-send to each bound provider thread
6. Auto-read and relay replies
7. Optional "listen for manual inserted message and sync to others"

## Risks

- DOM changes frequently
- Login state expires
- Rate limits or anti-bot challenges may interrupt flow
- Some providers may block aggressive automation

## Recommendation

Keep both modes:

- `API Relay` for stability and provider scaling
- `Web Session` for using existing subscriptions and web histories
