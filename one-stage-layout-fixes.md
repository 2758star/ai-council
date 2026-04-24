# 一台好戏图表修复包（按编号替换）

> 用法：按下面的 `Chart xx` 标题，在你的原文件中找到对应 `<Canvas>...</Canvas>` 整段替换。
> 另外先替换最上面的 `Canvas` 组件（全局防裁切）。

## 0) 先替换 Canvas 组件（全局）

```jsx
const Canvas = ({ children }) => (
  <div
    className="bg-white mx-auto border border-gray-200 shadow-sm relative overflow-hidden flex flex-col mt-4 mb-12"
    style={{ width: '1000px', height: '650px', boxSizing: 'border-box' }}
  >
    {/* 顶部安全留白 */}
    <div className="h-10 w-full shrink-0"></div>
    {/* 内容安全区：取消纵向居中，防止上下裁切 */}
    <div className="flex-1 px-8 pb-8 pt-2 w-full relative flex flex-col box-border">
      <div className="w-full h-full min-h-0">{children}</div>
    </div>
  </div>
);
```

---

## 1) Chart 01 / 品牌发展时间轴（去掉中间横线）

```jsx
<Canvas>
  <div className="relative w-full h-full flex items-center">
    <div
      className="absolute inset-0 bg-gradient-to-r from-yellow-50/80 via-white to-white pointer-events-none"
      style={{ clipPath: 'polygon(0 30%, 100% 0%, 100% 100%, 0 70%)' }}
    ></div>

    {/* 中间主线已移除 */}
    <div className="relative z-10 w-full flex justify-between items-start px-4">
      {[
        { year: '2018年', title: '成立与探索', desc: '成立并探索环境式驻演', icon: <PlayCircle size={20} />, top: true },
        { year: '创业早期', title: '模式转向', desc: '从巡演转向固定空间驻演', icon: <Map size={20} />, top: false },
        { year: '爆红阶段', title: '《阿波罗尼亚》', desc: '现象级出圈，形成品牌入口', icon: <Star size={20} />, top: true },
        { year: '集群化', title: '垂直百老汇', desc: '亚洲大厦剧场集群成型', icon: <Building2 size={20} />, top: false },
        { year: '线扩展', title: '产品线扩展', desc: '新空间/中大剧场/方寸剧场', icon: <Layers size={20} />, top: true },
        { year: '双轮驱动', title: '剧目+演员IP', desc: '线上内容与粉丝运营深化', icon: <Users size={20} />, top: false },
        { year: '2025前后', title: '多元与出海', desc: '快闪、联动、原创、出海', icon: <Map size={20} />, top: true },
      ].map((node, i) => (
        <div key={i} className={`flex flex-col w-28 ${node.top ? 'justify-end pb-6' : 'justify-start pt-6'} relative`}>
          <div className="flex flex-col items-center text-center">
            <div className="text-blue-800 mb-1.5">{node.icon}</div>
            <div className="font-bold text-blue-900 text-[13px] mb-1">{node.year}</div>
            <div className="font-bold text-gray-800 text-[13px] mb-1">{node.title}</div>
            <div className="text-[11px] text-gray-500 leading-tight break-words">{node.desc}</div>
          </div>
        </div>
      ))}
    </div>

    <div className="absolute bottom-4 right-4 font-bold text-blue-900/10 text-4xl">从单剧爆款到都市演艺生态</div>
  </div>
</Canvas>
```

---

## 2) Chart 02 / 巡演模式 vs 驻演模式（中间加箭头）

```jsx
<Canvas>
  <div className="w-full h-full flex flex-col py-2">
    <div className="flex justify-center items-center mb-6 text-gray-400">
      <div className="w-1/4 border-t-2 border-dashed border-gray-300"></div>
      <div className="px-6 text-base font-bold text-gray-500">由重到轻 · 由流动到深耕</div>
      <div className="w-1/4 border-t-2 border-solid border-blue-800"></div>
    </div>

    <div className="flex-1 flex items-stretch gap-6">
      <div className="flex-1 bg-gray-50 rounded-xl p-6 border border-gray-200 relative overflow-hidden">
        <h3 className="relative z-10 text-xl font-bold text-gray-700 mb-6 flex items-center">
          <Map className="mr-3 w-5 h-5" /> 传统巡演模式
        </h3>
        <div className="relative z-10 space-y-3">
          {[
            { label: '空间形态', val: '流动剧院车队 / 城市频繁切换' },
            { label: '成本结构', val: '运输与差旅成本高 / 场租波动大' },
            { label: '舞台拆装', val: '反复拆装，耗时且易损耗' },
            { label: '营销投入', val: '单城单次高投入，难沉淀' },
            { label: '排期品质', val: '档期与硬件不稳定，品质波动' },
            { label: '用户关系', val: '一次性消费为主，连接浅' },
          ].map((item, i) => (
            <div key={i} className="flex text-sm items-start">
              <span className="w-20 shrink-0 text-gray-500 font-bold">{item.label}</span>
              <span className="flex-1 text-gray-700">{item.val}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="w-12 flex items-center justify-center shrink-0">
        <ArrowRight className="w-10 h-10 text-blue-700" />
      </div>

      <div className="flex-1 bg-blue-50/50 rounded-xl p-6 border border-blue-200 relative overflow-hidden shadow-sm">
        <h3 className="relative z-10 text-xl font-bold text-blue-900 mb-6 flex items-center">
          <Building2 className="mr-3 w-5 h-5" /> 环境式驻演模式
        </h3>
        <div className="relative z-10 space-y-3">
          {[
            { label: '空间形态', val: '固定戏剧空间 / 专属场景化场地' },
            { label: '成本结构', val: '前期装台一次投入，后期边际成本低' },
            { label: '舞台拆装', val: '免拆装，沉浸感更稳定' },
            { label: '营销投入', val: '长线运营，口碑持续发酵' },
            { label: '排期品质', val: '密集稳定排期，品质一致性高' },
            { label: '用户关系', val: '复购和社群关系更强' },
          ].map((item, i) => (
            <div key={i} className="flex text-sm items-start">
              <span className="w-20 shrink-0 text-blue-800 font-bold">{item.label}</span>
              <span className="flex-1 text-blue-900 font-medium">{item.val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
</Canvas>
```

---

## 3) Chart 03 / 市场卡位图（横纵轴统一色）

```jsx
<Canvas>
  <div className="relative w-full h-full p-8">
    {/* 坐标轴：统一 slate 色 */}
    <div className="absolute left-16 top-10 bottom-16 border-l-2 border-slate-500"></div>
    <div className="absolute left-16 right-12 bottom-16 border-b-2 border-slate-500"></div>
    <div className="absolute left-[56px] top-8 border-l-[10px] border-r-[10px] border-b-[14px] border-transparent border-b-slate-500"></div>
    <div className="absolute right-8 bottom-[54px] border-t-[10px] border-b-[10px] border-l-[14px] border-transparent border-l-slate-500"></div>

    <div className="absolute left-4 top-1/2 -translate-y-1/2 -rotate-90 text-sm font-bold text-slate-600 tracking-widest">
      文化 / 艺术属性 (高)
    </div>
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-sm font-bold text-slate-600 tracking-widest">
      互动参与度 (高)
    </div>

    <div className="absolute left-16 top-10 w-1/2 h-1/2 bg-gray-50/50"></div>
    <div className="absolute right-12 top-10 w-[calc(50%-1rem)] h-1/2 bg-teal-50/30"></div>

    <div className="absolute inset-0">
      <div className="absolute top-[20%] left-[25%] flex flex-col items-center"><div className="w-3 h-3 rounded-full bg-slate-400 mb-1"></div><span className="text-sm text-slate-600 font-medium">话剧院/国有院团</span></div>
      <div className="absolute top-[30%] left-[35%] flex flex-col items-center"><div className="w-3 h-3 rounded-full bg-slate-500 mb-1"></div><span className="text-sm text-slate-600 font-medium">传统大剧院音乐剧</span></div>
      <div className="absolute top-[60%] left-[30%] flex flex-col items-center"><div className="w-3 h-3 rounded-full bg-slate-400 mb-1"></div><span className="text-sm text-slate-600 font-medium">文旅演艺</span></div>
      <div className="absolute top-[75%] left-[80%] flex flex-col items-center"><div className="w-3 h-3 rounded-full bg-slate-400 mb-1"></div><span className="text-sm text-slate-600 font-medium">密室逃脱</span></div>
      <div className="absolute top-[65%] left-[68%] flex flex-col items-center"><div className="w-3 h-3 rounded-full bg-slate-400 mb-1"></div><span className="text-sm text-slate-600 font-medium">剧本杀</span></div>
      <div className="absolute top-[80%] left-[55%] flex flex-col items-center"><div className="w-3 h-3 rounded-full bg-slate-400 mb-1"></div><span className="text-sm text-slate-600 font-medium">酒吧/社交空间</span></div>
      <div className="absolute top-[50%] left-[65%] flex flex-col items-center"><div className="w-3 h-3 rounded-full bg-slate-400 mb-1"></div><span className="text-sm text-slate-600 font-medium">Livehouse</span></div>

      <div className="absolute top-[25%] left-[65%] flex flex-col items-center">
        <div className="absolute -inset-6 border-2 border-teal-500 bg-teal-50/50 rounded-lg"></div>
        <div className="w-5 h-5 rounded-full bg-teal-600 mb-3 relative z-10 shadow-lg"></div>
        <span className="text-base font-bold text-teal-800 relative z-10 bg-white px-3 py-1.5 rounded border border-teal-200 shadow-sm whitespace-nowrap">
          一台好戏 (环境式驻演)
        </span>
        <span className="text-sm font-bold text-teal-600 mt-2 relative z-10">都市青年轻演艺</span>
      </div>
    </div>
  </div>
</Canvas>
```

---

## 5) Chart 05 / 沉浸式体验闭环图（彻底去重叠）

```jsx
<Canvas>
  <div className="relative w-full h-full flex items-center justify-center">
    <div className="absolute top-4 text-center z-20 flex flex-col items-center">
      <div className="text-2xl font-bold text-blue-900 mb-2">沉浸式体验闭环</div>
      <div className="text-sm text-gray-600 bg-white/90 px-6 py-2 rounded-full border border-gray-300 shadow-md">
        从看戏到入戏，再到反复回戏
      </div>
    </div>

    <div className="relative w-[820px] h-[430px]">
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] rounded-full border-2 border-dashed border-gray-300"></div>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-20">
        <div className="text-xl font-bold text-blue-900">体验引擎</div>
        <div className="text-xs text-gray-500 mt-1">场景 x 情绪 x 关系</div>
      </div>

      {[
        { title: '1. 场景实景化', desc: '酒馆/赌场/客厅化', top: '4%', left: '42%', icon: <Map className="w-4 h-4" /> },
        { title: '2. 物理距离拉近', desc: '演员与观众近距离', top: '18%', left: '69%', icon: <Users className="w-4 h-4" /> },
        { title: '3. 身份代入', desc: '观众成为故事的人', top: '44%', left: '78%', icon: <Target className="w-4 h-4" /> },
        { title: '4. 互动参与', desc: '剧情选择/角色回应', top: '70%', left: '66%', icon: <MessageSquare className="w-4 h-4" /> },
        { title: '5. 情绪共鸣', desc: '欢笑/暧昧/治愈', top: '78%', left: '38%', icon: <Heart className="w-4 h-4" /> },
        { title: '6. 社交分享', desc: '二创/打卡/口碑', top: '64%', left: '10%', icon: <MonitorSmartphone className="w-4 h-4" /> },
        { title: '7. 复购冲动', desc: '刷卡司/刷体验变体', top: '34%', left: '2%', icon: <RefreshCcw className="w-4 h-4" /> },
      ].map((item, i) => (
        <div
          key={i}
          className="absolute w-40 bg-white border border-blue-100 shadow-md rounded-xl p-3 text-center"
          style={{ top: item.top, left: item.left }}
        >
          <div className="text-blue-800 bg-blue-50 p-2 rounded-full mb-2 inline-flex">{item.icon}</div>
          <div className="font-bold text-gray-800 text-sm mb-1">{item.title}</div>
          <div className="text-xs text-gray-500 leading-tight">{item.desc}</div>
        </div>
      ))}
    </div>
  </div>
</Canvas>
```

---

## 6) Chart 06 / “1托N”矩阵（左标题同字号 + 右侧内容改版）

```jsx
<Canvas>
  <div className="w-full h-full flex items-center px-8 gap-8">
    <div className="w-[32%] flex justify-end relative z-10 shrink-0">
      <div className="bg-gradient-to-br from-blue-900 to-blue-800 text-white p-7 rounded-2xl shadow-xl w-72 text-center border-4 border-gold/40 relative">
        <div className="absolute -right-8 top-1/2 -translate-y-1/2 text-gold"><ArrowRight size={40} /></div>
        <h3 className="font-bold text-2xl mb-3">《阿波罗尼亚》</h3>
        <h3 className="font-bold text-2xl mb-4 border-b border-white/20 pb-3">《桑塔露琪亚》</h3>
        <div className="text-sm text-blue-200 leading-relaxed">核心入口 / 稳定复购 / 品牌声量引擎</div>
      </div>
    </div>

    <div className="w-[68%] flex flex-col justify-between h-[430px] py-2 pl-8 border-l-2 border-dashed border-gray-300 relative">
      {[
        {
          name: '星空间驻演矩阵',
          tag: '现金流主力',
          items: ['阿波罗尼亚', '桑塔露琪亚', '多剧并行常态化驻演'],
        },
        {
          name: '方寸剧场（黑匣子）',
          tag: '原创孵化',
          items: ['新题材试验', '小体量高密度验证', '内容迭代'],
        },
        {
          name: '中大剧场升级线',
          tag: '品牌放大器',
          items: ['升级制作规模', '拓宽客群', '拉升品牌势能'],
        },
        {
          name: '城市联动/快闪活动',
          tag: '增量触达',
          items: ['商圈快闪', '嘉年华联动', '非剧场触点获客'],
        },
        {
          name: '跨语种/海外试水',
          tag: '第二曲线',
          items: ['原创内容输出', '本地化改编', '海外驻演试验'],
        },
      ].map((branch, i) => (
        <div key={i} className="flex items-center relative min-h-[72px]">
          <div className="absolute -left-8 w-8 border-t-2 border-gray-300"></div>
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex-1 ml-3 flex justify-between items-start shadow-sm">
            <div className="flex flex-col pr-3">
              <span className="font-bold text-gray-800 text-base mb-1">{branch.name}</span>
              <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                {branch.items.map((item, idx) => (
                  <span key={idx} className="bg-gray-50 px-2 py-1 rounded border border-gray-200">{item}</span>
                ))}
              </div>
            </div>
            <div className="bg-blue-50 text-blue-800 font-bold text-xs px-3 py-1.5 rounded-full border border-blue-200 whitespace-nowrap">
              {branch.tag}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
</Canvas>
```

---

## 7) Chart 07 / 双IP飞轮（展开排版）

```jsx
<Canvas>
  <div className="w-full h-full flex flex-col justify-center px-6">
    <div className="text-center mb-6">
      <h3 className="text-3xl font-bold text-gray-800">双轮驱动飞轮效应</h3>
      <p className="text-gray-500 text-base mt-1">信息密度下调，保证截图可读性</p>
    </div>

    <div className="grid grid-cols-[1fr_220px_1fr] gap-4 items-stretch h-[430px]">
      <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-5 flex flex-col">
        <div className="font-bold text-blue-900 text-xl mb-4">剧目 IP 飞轮</div>
        <div className="grid grid-cols-2 gap-2 text-sm font-bold text-gray-700">
          <div className="bg-white p-2.5 rounded border">世界观设定</div>
          <div className="bg-white p-2.5 rounded border">场景记忆</div>
          <div className="bg-white p-2.5 rounded border">主题歌曲</div>
          <div className="bg-white p-2.5 rounded border">名场面</div>
          <div className="bg-white p-2.5 rounded border">角色关系</div>
          <div className="bg-white p-2.5 rounded border">口碑传播</div>
        </div>
      </div>

      <div className="rounded-2xl bg-teal-600 text-white flex flex-col items-center justify-center px-4 shadow-xl">
        <RefreshCcw size={30} className="mb-2" />
        <div className="font-bold text-lg mb-2">飞轮结果</div>
        <div className="text-sm text-center space-y-1">
          <div>情感绑定</div>
          <div>高频复购</div>
          <div>社群裂变</div>
          <div>非票收入增长</div>
        </div>
      </div>

      <div className="rounded-2xl border-2 border-yellow-300 bg-amber-50 p-5 flex flex-col">
        <div className="font-bold text-amber-800 text-xl mb-4">演员 IP 飞轮</div>
        <div className="grid grid-cols-2 gap-2 text-sm font-bold text-gray-700">
          <div className="bg-white p-2.5 rounded border">卡司差异</div>
          <div className="bg-white p-2.5 rounded border">CP组合</div>
          <div className="bg-white p-2.5 rounded border">互动体验</div>
          <div className="bg-white p-2.5 rounded border">粉丝陪伴</div>
          <div className="bg-white p-2.5 rounded border">二创传播</div>
          <div className="bg-white p-2.5 rounded border">刷卡司行为</div>
        </div>
      </div>
    </div>
  </div>
</Canvas>
```

---

## 8) Chart 08 / 用户生命周期阶梯（修复左下裁切）

```jsx
<Canvas>
  <div className="w-full h-full flex flex-col justify-end px-8 pb-6 relative">
    <div className="absolute top-4 left-1/2 -translate-x-1/2 text-xl font-bold text-blue-900 flex items-center gap-2">
      <Star className="text-gold w-6 h-6" /> 品牌共同体生态 <Star className="text-gold w-6 h-6" />
    </div>

    <div className="flex w-full items-end justify-center gap-1 mt-10">
      {[
        { stage: '1. 泛受众', req: '猎奇/打卡', action: '内容种草', res: '首次到店', h: 'h-32', bg: 'bg-gray-100', text: 'text-gray-700' },
        { stage: '2. 初级粉丝', req: '互动体验', action: '触点优化', res: '身份认同', h: 'h-40', bg: 'bg-blue-50', text: 'text-blue-800' },
        { stage: '3. 核心粉丝', req: '圈层归属', action: '会员+排期', res: '持续复购', h: 'h-52', bg: 'bg-blue-100', text: 'text-blue-900' },
        { stage: '4. 死忠粉', req: '共创陪伴', action: '特权激励', res: '品牌布道', h: 'h-60', bg: 'bg-blue-900', text: 'text-white' },
      ].map((step, i) => (
        <div key={i} className={`${step.h} ${step.bg} flex-1 border-t-8 ${i === 3 ? 'border-gold' : 'border-blue-900'} flex flex-col justify-between p-4 shadow-sm`}>
          <div className="font-bold text-center text-sm mb-2">{step.stage}</div>
          <div className="text-xs leading-relaxed space-y-2">
            <div>
              <div className={`font-bold opacity-70 ${step.text}`}>核心诉求</div>
              <div className={step.text}>{step.req}</div>
            </div>
            <div className="pt-1 border-t border-black/10">
              <div className={`font-bold opacity-70 ${step.text}`}>关键动作</div>
              <div className={step.text}>{step.action}</div>
            </div>
          </div>
          <div className={`text-xs font-bold text-center py-2 bg-black/10 rounded mt-2 leading-tight break-words ${step.text}`}>
            转化结果：{step.res}
          </div>
        </div>
      ))}
    </div>
  </div>
</Canvas>
```

---

## 9) Chart 09 / 全链路图（重排防裁切）

```jsx
<Canvas>
  <div className="w-full h-full p-8 flex flex-col">
    <div className="text-center mb-6">
      <h3 className="text-2xl font-bold text-gray-800">从流量到留量的全链路经营地图</h3>
      <p className="text-gray-500 text-sm mt-1">从公域触达，到私域沉淀，再到复购裂变</p>
    </div>

    <div className="flex-1 flex flex-col justify-center gap-8">
      <div className="grid grid-cols-3 gap-4">
        {[
          { title: '1. 公域种草', desc: '微博/抖音/小红书/B站', icon: <Search /> },
          { title: '2. 内容扩散', desc: '二创+微综艺+口碑发酵', icon: <MessageSquare /> },
          { title: '3. 线下触达', desc: '剧场/快闪/嘉年华联动', icon: <Map /> },
        ].map((node, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="w-12 h-12 bg-blue-50 border-2 border-blue-300 rounded-full flex items-center justify-center text-blue-700 mb-3 mx-auto">{node.icon}</div>
            <div className="font-bold text-center text-gray-800 mb-1">{node.title}</div>
            <div className="text-xs text-center text-gray-500">{node.desc}</div>
          </div>
        ))}
      </div>

      <div className="flex justify-center">
        <ArrowDown className="w-8 h-8 text-blue-600" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { title: '4. 私域沉淀', desc: '会员注册/社群/优先购', icon: <Users /> },
          { title: '5. 情绪归属', desc: '角色认同/卡司连接/圈层归属', icon: <Heart /> },
          { title: '6. 复购裂变', desc: '刷剧刷卡司/安利新圈层', icon: <RefreshCcw /> },
        ].map((node, i) => (
          <div key={i} className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm">
            <div className="w-12 h-12 bg-white border-2 border-blue-300 rounded-full flex items-center justify-center text-blue-700 mb-3 mx-auto">{node.icon}</div>
            <div className="font-bold text-center text-blue-900 mb-1">{node.title}</div>
            <div className="text-xs text-center text-blue-700">{node.desc}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
</Canvas>
```

---

## 10) Chart 10 / 挑战与战略选择（横纵轴闭合）

```jsx
<Canvas>
  <div className="relative w-full h-full p-8">
    {/* 闭合坐标框 */}
    <div className="absolute left-16 right-10 top-12 bottom-14 border border-slate-300 rounded-xl"></div>

    {/* 主轴：同一原点闭合 */}
    <div className="absolute left-16 top-12 bottom-14 w-[2px] bg-slate-500"></div>
    <div className="absolute left-16 right-10 bottom-14 h-[2px] bg-slate-500"></div>
    <div className="absolute left-[12px] top-1/2 -translate-y-1/2 -rotate-90 text-sm font-bold text-slate-600 tracking-widest whitespace-nowrap">外部扩张压力 (高)</div>
    <div className="absolute left-1/2 -translate-x-1/2 bottom-4 text-sm font-bold text-slate-600 tracking-widest">内部能力成熟度 (高)</div>
    <div className="absolute left-[12px] top-9 border-x-[6px] border-b-[10px] border-transparent border-b-slate-500"></div>
    <div className="absolute right-7 bottom-[9px] border-y-[6px] border-l-[10px] border-transparent border-l-slate-500"></div>

    <div className="grid grid-cols-2 grid-rows-2 w-full h-full gap-4 pl-14 pr-3 pt-6 pb-8">
      {[
        { title: '全国扩张与区域适配', desc: '不同城市的消费结构、场地资源与文化偏好差异，要求复制模型具备高适配能力。', bg: 'bg-orange-50 border-orange-200' },
        { title: '出海探索与文化转译', desc: '原创内容在跨语境传播中，需要同时处理本地化改编、版权与长期运营能力。', bg: 'bg-blue-50 border-blue-200' },
        { title: '人才造血与品控平衡', desc: '演出密度上升后，演员供给与互动质量之间的矛盾会持续放大。', bg: 'bg-gray-50 border-gray-200' },
        { title: '原创内容与版权依赖', desc: '从引进驱动转向原创驱动，需要稳定的内容研发与商业验证机制。', bg: 'bg-teal-50 border-teal-200' },
      ].map((box, i) => (
        <div key={i} className={`border rounded-xl p-5 flex flex-col justify-center shadow-sm ${box.bg}`}>
          <h3 className="text-lg font-bold text-gray-800 mb-2">{box.title}</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{box.desc}</p>
        </div>
      ))}
    </div>

    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[58%] bg-blue-900 text-white px-6 py-3 rounded-full font-bold shadow-lg border-4 border-white text-base">
      核心挑战：从爆款逻辑走向系统能力建设
    </div>
  </div>
</Canvas>
```

---

## 11) Chart 11 / STP 漏斗（防溢出）

```jsx
<Canvas>
  <div className="w-full h-full flex flex-col items-center justify-center py-4 px-8">
    <div className="w-[90%] flex flex-col items-center space-y-2">
      <div className="w-full bg-gray-100 border-t-[8px] border-gray-300 p-4 text-center rounded-t-xl shadow-sm">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Segmentation / 市场细分</div>
        <div className="flex justify-center flex-wrap gap-2 text-sm text-gray-700 font-bold">
          <span className="bg-white px-3 py-1 rounded border">传统大剧场</span>
          <span className="bg-white px-3 py-1 rounded border">旅游演艺</span>
          <span className="bg-blue-50 text-blue-800 px-3 py-1 rounded border border-blue-200">都市青年轻娱乐</span>
        </div>
      </div>

      <div className="w-[82%] bg-blue-50 border-t-[8px] border-blue-300 p-4 text-center shadow-sm">
        <div className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Targeting / 目标市场选择</div>
        <div className="text-xl font-bold text-blue-900 mb-1">Z世代都市青年群体</div>
        <div className="text-sm text-blue-700 font-medium">高互动性 / 情绪价值 / 社交属性 / 低门槛</div>
      </div>

      <div className="w-[62%] bg-blue-900 border-t-[8px] border-gold p-5 text-center rounded-b-2xl shadow-xl">
        <div className="text-xs font-bold text-blue-300 uppercase tracking-widest mb-2">Positioning / 市场定位</div>
        <div className="text-2xl font-bold text-white mb-2">都市线下轻演艺</div>
        <div className="text-sm text-blue-100">文化属性 + 参与感兼具的沉浸式体验</div>
      </div>
    </div>

    <div className="mt-5 text-gray-700 font-bold bg-white px-6 py-3 border border-gray-200 rounded-full shadow-sm text-base flex items-center">
      <Target className="mr-2 text-gold w-4 h-4" /> 战略总结：避开红海，切入轻演艺蓝海
    </div>
  </div>
</Canvas>
```

---

## 13) Chart 13 / 产品金字塔（防截断）

```jsx
<Canvas>
  <div className="w-full h-full flex flex-col justify-end items-center pb-6 pt-8 relative">
    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-full text-center">
      <h3 className="text-2xl font-bold text-gray-800">多维产品战略金字塔</h3>
    </div>

    <div className="w-[42%] bg-blue-900 text-white p-4 text-center border-b-2 border-blue-800 relative shadow-lg z-30">
      <div className="font-bold text-xl mb-1 flex justify-center items-center"><Star className="w-4 h-4 mr-2 text-gold" /> 塔尖：品牌势能与创新</div>
      <div className="text-xs text-blue-200 mb-2">拔高品牌上限，探索未来边界</div>
      <div className="flex justify-center flex-wrap gap-2 text-xs font-bold">
        <span className="bg-white/20 px-2 py-1 rounded">中大剧场版</span>
        <span className="bg-white/20 px-2 py-1 rounded">原创实验剧</span>
        <span className="bg-white/20 px-2 py-1 rounded">文化出海作品</span>
      </div>
    </div>

    <div className="w-[66%] bg-blue-700 text-white p-5 text-center border-b-2 border-blue-600 shadow-md z-20">
      <div className="font-bold text-xl mb-1">塔身：利润与规模核心</div>
      <div className="text-xs text-blue-200 mb-2">主力收入来源 / 高频复购引擎</div>
      <div className="flex justify-center flex-wrap gap-2 text-sm font-bold">
        <span className="bg-white/20 px-3 py-1.5 rounded-lg border border-white/30">爆款环境式驻演剧目</span>
      </div>
    </div>

    <div className="w-[90%] bg-blue-50 text-blue-900 p-5 text-center rounded-b-2xl border-x-2 border-b-2 border-blue-200 shadow-xl z-10">
      <div className="font-bold text-xl mb-1">塔基：低门槛引流产品</div>
      <div className="text-xs text-blue-600 mb-3">培育首看用户 / 扩大漏斗开口 / 提供社交入口</div>
      <div className="flex justify-center flex-wrap gap-3 text-sm font-bold">
        <span className="bg-white px-4 py-2 rounded-lg shadow-sm border border-blue-100">演艺新空间基础驻演</span>
        <span className="bg-white px-4 py-2 rounded-lg shadow-sm border border-blue-100">酒吧剧场与轻量互动活动</span>
      </div>
    </div>
  </div>
</Canvas>
```

---

## 14) Chart 14 / 用户旅程（展开为 4x2）

```jsx
<Canvas>
  <div className="w-full h-full flex flex-col justify-center px-6 pb-2">
    <div className="relative h-24 w-full mb-4 px-8">
      <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 100">
        <path d="M 0,75 C 100,75 100,55 200,55 C 300,55 300,68 400,68 C 500,68 500,18 600,18 C 700,18 700,38 800,38" fill="none" stroke="#0d9488" strokeWidth="5" className="opacity-60" />
        <circle cx="200" cy="55" r="7" fill="#0d9488" />
        <circle cx="600" cy="18" r="9" fill="#ca8a04" />
        <circle cx="800" cy="38" r="7" fill="#0d9488" />
      </svg>
      <div className="absolute top-0 right-[16%] text-gold font-bold text-xs bg-white/90 px-2 py-1 rounded">情绪峰值：观演互动</div>
    </div>

    <div className="grid grid-cols-4 gap-3">
      {[
        ['1.认知', '朋友安利/短视频'],
        ['2.种草', '口碑发酵/热梗'],
        ['3.购票', '查卡司/抢票'],
        ['4.到场', '实景打卡/候场氛围'],
        ['5.观演', '近距离互动/情绪沉浸'],
        ['6.离场', 'SD互动/周边消费'],
        ['7.分享', '二创/社媒晒单'],
        ['8.再购', '刷卡司/会员特权'],
      ].map((item, idx) => (
        <div
          key={idx}
          className={`p-3 rounded-lg border shadow-sm text-center ${idx === 4 || idx === 7 ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'}`}
        >
          <div className={`font-bold mb-1 ${idx === 4 || idx === 7 ? 'text-blue-900' : 'text-gray-800'}`}>{item[0]}</div>
          <div className={`text-xs leading-relaxed ${idx === 4 || idx === 7 ? 'text-blue-700' : 'text-gray-600'}`}>{item[1]}</div>
        </div>
      ))}
    </div>

    <div className="mt-4 flex text-sm font-bold text-gray-600 bg-white py-2.5 px-4 rounded border border-gray-100 justify-center items-center">
      <Target className="w-4 h-4 mr-2 text-teal-600" /> 完整旅程触点被系统化管理，持续强化品牌粘性
    </div>
  </div>
</Canvas>
```

---

## 16) Chart 16 / RFM（图例移出主绘图区，不遮挡）

```jsx
<Canvas>
  <div className="relative w-full h-full p-10">
    <div className="absolute left-16 top-14 bottom-24 border-l-2 border-slate-500"></div>
    <div className="absolute left-16 right-16 bottom-24 border-b-2 border-slate-500"></div>
    <div className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 font-bold text-slate-600 whitespace-nowrap text-sm">最近消费时间 Recency (越近越高)</div>
    <div className="absolute left-1/2 -translate-x-1/2 bottom-12 font-bold text-slate-600 text-sm">消费频率 Frequency (越高越右)</div>

    <div className="absolute inset-0">
      <div className="absolute top-[24%] right-[22%] w-36 h-36 bg-blue-900/90 rounded-full text-white shadow-xl border-4 border-blue-500 flex items-center justify-center text-center p-2">
        <div><div className="font-bold text-base">高价值核心粉</div><div className="text-[11px] opacity-90">优先购票/深度运营</div></div>
      </div>
      <div className="absolute top-[40%] right-[42%] w-28 h-28 bg-blue-600/85 rounded-full text-white shadow-lg flex items-center justify-center text-center p-2">
        <div><div className="font-bold text-sm">稳定复购客</div><div className="text-[10px]">会员权益</div></div>
      </div>
      <div className="absolute top-[30%] left-[30%] w-24 h-24 bg-teal-500/85 rounded-full text-white shadow-md flex items-center justify-center text-center p-2">
        <div><div className="font-bold text-xs">新客尝鲜者</div><div className="text-[10px]">首购激励</div></div>
      </div>
      <div className="absolute top-[64%] left-[45%] w-20 h-20 bg-yellow-500/85 rounded-full text-white shadow-sm flex items-center justify-center text-center p-1">
        <div><div className="font-bold text-xs">偶发观众</div><div className="text-[9px]">内容唤醒</div></div>
      </div>
      <div className="absolute bottom-[32%] left-[25%] w-16 h-16 bg-gray-400/85 rounded-full text-white flex items-center justify-center text-center p-1">
        <div><div className="font-bold text-[10px]">沉睡</div></div>
      </div>
    </div>

    {/* 图例移到底部中间 */}
    <div className="absolute left-1/2 -translate-x-1/2 bottom-2 border border-gray-200 bg-white px-4 py-2 rounded-lg shadow-sm text-xs text-gray-600 flex gap-5">
      <div className="font-bold text-gray-800">气泡大小 = Monetary</div>
      <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-900 rounded-full"></div>核心价值用户</div>
      <div className="flex items-center gap-2"><div className="w-3 h-3 bg-teal-500 rounded-full"></div>潜在增长用户</div>
    </div>
  </div>
</Canvas>
```

---

## 18) Chart 18 / 721 模型（不遮挡 + 底部不裁）

```jsx
<Canvas>
  <div className="w-full h-full flex items-center justify-center gap-10 px-6">
    <div className="relative w-[340px] h-[340px] flex justify-center items-center shrink-0">
      <div className="absolute inset-0 bg-blue-900 rounded-full flex flex-col items-center justify-start pt-8 text-white shadow-xl border-4 border-white z-10">
        <span className="text-3xl font-bold">70%</span>
        <span className="text-base mt-1 font-medium text-blue-200">实战演出轮换</span>
      </div>
      <div className="absolute inset-[58px] bg-blue-600 rounded-full flex flex-col items-center justify-start pt-6 text-white shadow-xl border-4 border-white z-20">
        <span className="text-2xl font-bold">20%</span>
        <span className="text-sm mt-1 font-medium text-blue-100">导师复盘辅导</span>
      </div>
      <div className="absolute inset-[122px] bg-teal-500 rounded-full flex flex-col items-center justify-center text-white shadow-xl border-4 border-white z-30">
        <span className="text-xl font-bold mb-1">10%</span>
        <span className="text-xs font-medium">正式培训</span>
      </div>
    </div>

    <div className="w-[56%] flex flex-col gap-4">
      <h3 className="text-2xl font-bold text-gray-800 border-l-8 border-blue-900 pl-3">演艺界黄埔军校的造血体系</h3>
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="font-bold text-blue-900 text-lg mb-1 flex items-center"><PlayCircle className="w-4 h-4 mr-2" /> 70% 实战演出</div>
        <div className="text-sm text-gray-600">高频轮换上台，在真实互动中快速提升应变和稳定性。</div>
      </div>
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="font-bold text-blue-600 text-lg mb-1 flex items-center"><Users className="w-4 h-4 mr-2" /> 20% 导师辅导</div>
        <div className="text-sm text-gray-600">演后复盘+针对性微调，保证扩张期的统一品控。</div>
      </div>
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="font-bold text-teal-600 text-lg mb-1 flex items-center"><Layers className="w-4 h-4 mr-2" /> 10% 正式培训</div>
        <div className="text-sm text-gray-600">声乐、台词、互动技巧与剧场规范作为基座能力。</div>
      </div>
      <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-900 font-bold flex items-start gap-2">
        <Target className="shrink-0 text-orange-600 w-4 h-4" />
        目标：同时解决“供给短缺”与“互动品控”两大矛盾。
      </div>
    </div>
  </div>
</Canvas>
```

---

## 20) Chart 20 / 动态能力三阶段（文字入框）

```jsx
<Canvas>
  <div className="w-full h-full flex flex-col justify-center p-8 relative">
    <div className="text-center text-2xl font-bold text-gray-800 border-b-4 border-blue-900 pb-2 mb-5">
      企业动态能力演进路径 (Dynamic Capabilities Framework)
    </div>

    <div className="flex w-full items-stretch gap-3 h-[430px]">
      <div className="flex-1 bg-white border-2 border-gray-200 rounded-2xl flex flex-col p-5 shadow-md">
        <div className="font-bold text-xl text-gray-800 mb-3 flex items-center border-b pb-2"><Search className="mr-2 text-gray-500 w-5 h-5" /> 1. 感知 Sensing</div>
        <ul className="text-sm text-gray-600 space-y-2 leading-relaxed">
          <li className="flex items-start"><div className="w-2 h-2 bg-gray-400 rounded-full mt-1.5 mr-2 shrink-0"></div>识别 Z 世代对情绪价值与近距离互动的需求</li>
          <li className="flex items-start"><div className="w-2 h-2 bg-gray-400 rounded-full mt-1.5 mr-2 shrink-0"></div>捕捉演艺新空间政策与商圈空间红利</li>
          <li className="flex items-start"><div className="w-2 h-2 bg-gray-400 rounded-full mt-1.5 mr-2 shrink-0"></div>判断沉浸式线下娱乐长期增长趋势</li>
        </ul>
      </div>

      <div className="w-8 flex items-center justify-center"><ChevronRight className="w-6 h-6 text-blue-400" /></div>

      <div className="flex-1 bg-blue-50 border-2 border-blue-200 rounded-2xl flex flex-col p-5 shadow-md">
        <div className="font-bold text-xl text-blue-900 mb-3 flex items-center border-b border-blue-200 pb-2"><Target className="mr-2 text-blue-500 w-5 h-5" /> 2. 捕捉 Seizing</div>
        <ul className="text-sm text-gray-700 space-y-2 leading-relaxed">
          <li className="flex items-start"><div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 mr-2 shrink-0"></div>落地环境式驻演模式，形成稳定可复制机制</li>
          <li className="flex items-start"><div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 mr-2 shrink-0"></div>集中资源打磨爆款，建立品牌入口效应</li>
          <li className="flex items-start"><div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 mr-2 shrink-0"></div>构建“剧目IP+演员IP”双轮与私域社群</li>
        </ul>
      </div>

      <div className="w-8 flex items-center justify-center"><ChevronRight className="w-6 h-6 text-gold" /></div>

      <div className="flex-1 bg-gradient-to-br from-blue-900 to-gray-900 border-2 border-blue-900 rounded-2xl flex flex-col p-5 shadow-xl text-white">
        <div className="font-bold text-xl mb-3 flex items-center border-b border-gray-600 pb-2"><RefreshCcw className="mr-2 text-gold w-5 h-5" /> 3. 转型 Transforming</div>
        <ul className="text-sm text-blue-100 space-y-2 leading-relaxed">
          <li className="flex items-start"><div className="w-2 h-2 bg-gold rounded-full mt-1.5 mr-2 shrink-0"></div>从单爆款走向多层次产品矩阵</li>
          <li className="flex items-start"><div className="w-2 h-2 bg-gold rounded-full mt-1.5 mr-2 shrink-0"></div>从单剧场经营升级为城市文化地标运营</li>
          <li className="flex items-start"><div className="w-2 h-2 bg-gold rounded-full mt-1.5 mr-2 shrink-0"></div>从引进为主转向原创孵化与出海并行</li>
          <li className="flex items-start"><div className="w-2 h-2 bg-gold rounded-full mt-1.5 mr-2 shrink-0"></div>从一次性流量转向留量生态经营</li>
        </ul>
      </div>
    </div>
  </div>
</Canvas>
```

---



