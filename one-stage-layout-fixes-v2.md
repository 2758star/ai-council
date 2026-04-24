# Gemini 图表修复 v2（按 Chart 替换）

## Chart 03
```jsx
<Canvas>
  <div className="relative w-full h-full p-8">
    <div className="absolute left-16 top-10 bottom-16 border-l-2 border-slate-500"></div>
    <div className="absolute left-16 right-12 bottom-16 border-b-2 border-slate-500"></div>
    <div className="absolute left-[56px] top-8 border-l-[10px] border-r-[10px] border-b-[14px] border-transparent border-b-slate-500"></div>
    <div className="absolute right-8 bottom-[54px] border-t-[10px] border-b-[10px] border-l-[14px] border-transparent border-l-slate-500"></div>

    <div className="absolute left-4 top-1/2 -translate-y-1/2 -rotate-90 text-sm font-bold text-slate-600 tracking-widest">文化属性（高）</div>
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-sm font-bold text-slate-600 tracking-widest">互动参与度（高）</div>

    <div className="absolute inset-0">
      <div className="absolute top-[20%] left-[25%] flex flex-col items-center"><div className="w-3 h-3 rounded-full bg-slate-400 mb-1"></div><span className="text-sm text-slate-600 font-medium">话剧院</span></div>
      <div className="absolute top-[30%] left-[35%] flex flex-col items-center"><div className="w-3 h-3 rounded-full bg-slate-500 mb-1"></div><span className="text-sm text-slate-600 font-medium">大剧院音乐剧</span></div>
      <div className="absolute top-[60%] left-[30%] flex flex-col items-center"><div className="w-3 h-3 rounded-full bg-slate-400 mb-1"></div><span className="text-sm text-slate-600 font-medium">文旅演艺</span></div>
      <div className="absolute top-[75%] left-[80%] flex flex-col items-center"><div className="w-3 h-3 rounded-full bg-slate-400 mb-1"></div><span className="text-sm text-slate-600 font-medium">密室</span></div>
      <div className="absolute top-[65%] left-[68%] flex flex-col items-center"><div className="w-3 h-3 rounded-full bg-slate-400 mb-1"></div><span className="text-sm text-slate-600 font-medium">剧本杀</span></div>
      <div className="absolute top-[80%] left-[55%] flex flex-col items-center"><div className="w-3 h-3 rounded-full bg-slate-400 mb-1"></div><span className="text-sm text-slate-600 font-medium">社交酒吧</span></div>
      <div className="absolute top-[50%] left-[65%] flex flex-col items-center"><div className="w-3 h-3 rounded-full bg-slate-400 mb-1"></div><span className="text-sm text-slate-600 font-medium">Livehouse</span></div>

      <div className="absolute top-[25%] left-[65%] flex flex-col items-center">
        <div className="absolute -inset-5 border-2 border-teal-500 bg-teal-50/40 rounded-lg"></div>
        <div className="w-5 h-5 rounded-full bg-teal-600 mb-2 relative z-10 shadow-lg"></div>
        <span className="text-base font-bold text-teal-800 relative z-10 bg-white px-3 py-1 rounded border border-teal-200 shadow-sm whitespace-nowrap">一台好戏（驻演）</span>
      </div>
    </div>
  </div>
</Canvas>
```

## Chart 04
```jsx
<Canvas>
  <div className="w-full h-full grid grid-cols-[1.05fr_0.95fr] gap-8 px-8 py-4">
    <div className="space-y-4">
      <h3 className="text-2xl font-bold text-blue-900 whitespace-nowrap">老楼更新 -> 演艺集群</h3>
      <div className="space-y-3">
        {['固定空间：降拆装损耗','多剧并行：提升排期密度','剧场聚落：强化目的地属性','城市地标：放大夜间经济'].map((t, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">{t}</div>
        ))}
      </div>
    </div>

    <div className="flex justify-center items-end">
      <div className="w-72 h-[470px] bg-gray-800 rounded-t-2xl p-3 border-4 border-gray-900 shadow-2xl">
        <div className="text-center text-white/60 text-xs tracking-widest mb-2">VERTICAL BROADWAY</div>
        <div className="h-[82px] bg-purple-900/70 border border-purple-400 rounded-lg flex items-center justify-center text-white font-bold whitespace-nowrap">沉浸式空间</div>
        <div className="h-[82px] mt-2 bg-blue-900/70 border border-blue-400 rounded-lg flex items-center justify-center text-white font-bold whitespace-nowrap">中大剧场</div>
        <div className="h-[82px] mt-2 bg-yellow-900/70 border border-yellow-500 rounded-lg flex items-center justify-center text-white font-bold whitespace-nowrap">酒馆剧场</div>
        <div className="h-[82px] mt-2 bg-teal-900/70 border border-teal-400 rounded-lg flex items-center justify-center text-white font-bold whitespace-nowrap">小剧场</div>
        <div className="h-[82px] mt-2 bg-gray-700 border border-gray-400 rounded-lg flex items-center justify-center text-white font-bold whitespace-nowrap">社交与周边区</div>
      </div>
    </div>
  </div>
</Canvas>
```

## Chart 05
```jsx
<Canvas>
  <div className="relative w-full h-full flex items-center justify-center">
    <div className="absolute top-3 text-center"><div className="text-2xl font-bold text-blue-900">沉浸式体验闭环</div></div>

    <div className="relative w-[820px] h-[430px]">
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full border-2 border-dashed border-gray-300"></div>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center"><div className="text-xl font-bold text-blue-900">体验引擎</div></div>

      {[
        { t: '1 场景实景化', d: '酒馆化', x: '50%', y: '8%' },
        { t: '2 物理距离近', d: '近距离', x: '76%', y: '20%' },
        { t: '3 身份代入', d: '入戏感', x: '86%', y: '48%' },
        { t: '4 互动参与', d: '可互动', x: '72%', y: '74%' },
        { t: '5 情绪共鸣', d: '强共鸣', x: '50%', y: '86%' },
        { t: '6 社交分享', d: '二创化', x: '28%', y: '74%' },
        { t: '7 复购冲动', d: '多刷剧', x: '14%', y: '48%' },
      ].map((n, i) => (
        <div key={i} className="absolute -translate-x-1/2 -translate-y-1/2 w-32 bg-white border border-blue-100 rounded-xl px-2 py-2 text-center shadow-sm" style={{ left: n.x, top: n.y }}>
          <div className="text-sm font-bold text-gray-800 whitespace-nowrap">{n.t}</div>
          <div className="text-xs text-gray-500 whitespace-nowrap">{n.d}</div>
        </div>
      ))}
    </div>
  </div>
</Canvas>
```

## Chart 06
```jsx
<Canvas>
  <div className="w-full h-full grid grid-cols-[300px_1fr] gap-6 px-6 py-4">
    <div className="flex items-center justify-center">
      <div className="bg-gradient-to-br from-blue-900 to-blue-800 text-white p-6 rounded-2xl w-72 text-center border-4 border-gold/40 shadow-xl">
        <h3 className="font-bold text-2xl whitespace-nowrap">《阿波罗尼亚》</h3>
        <h3 className="font-bold text-2xl mt-2 whitespace-nowrap">《桑塔露琪亚》</h3>
        <p className="text-blue-200 text-sm mt-4 whitespace-nowrap">核心入口 / 品牌现金牛</p>
      </div>
    </div>

    <div className="grid grid-rows-5 gap-3 border-l-2 border-dashed border-gray-300 pl-4">
      {[
        ['星空间驻演矩阵', '阿波罗尼亚 · 桑塔露琪亚 · 多剧并行', '现金流主力'],
        ['方寸剧场', '黑匣子试验 · 原创孵化', '原创孵化'],
        ['中大剧场升级线', '升级制作规模 · 拓宽客群', '品牌放大'],
        ['城市联动快闪', '商圈触点 · 嘉年华联动', '增量触达'],
        ['跨语种海外试水', '本地化改编 · 海外驻演尝试', '第二曲线'],
      ].map((r, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm flex items-center justify-between gap-3">
          <div>
            <div className="font-bold text-gray-800 whitespace-nowrap">{r[0]}</div>
            <div className="text-xs text-gray-500 whitespace-nowrap">{r[1]}</div>
          </div>
          <div className="text-xs font-bold text-blue-800 bg-blue-50 border border-blue-200 rounded-full px-3 py-1 whitespace-nowrap">{r[2]}</div>
        </div>
      ))}
    </div>
  </div>
</Canvas>
```

## Chart 07
```jsx
<Canvas>
  <div className="w-full h-full flex flex-col px-6 py-4">
    <div className="text-center mb-4"><h3 className="text-3xl font-bold text-gray-800">双 IP 飞轮</h3></div>

    <div className="grid grid-cols-[1fr_220px_1fr] gap-4 h-[450px]">
      <div className="border-2 border-blue-200 rounded-2xl bg-blue-50 p-4">
        <div className="font-bold text-blue-900 text-xl mb-3 whitespace-nowrap">剧目 IP</div>
        <div className="grid grid-cols-2 gap-2 text-xs font-bold text-gray-700">
          {['世界观', '场景记忆', '主题歌', '名场面', '角色关系', '口碑传播'].map((x) => (
            <div key={x} className="bg-white border rounded px-2 py-2 text-center whitespace-nowrap">{x}</div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-teal-600 text-white shadow-xl flex flex-col items-center justify-center">
        <RefreshCcw size={28} />
        <div className="font-bold text-lg mt-2 whitespace-nowrap">飞轮结果</div>
        <div className="text-sm mt-2 space-y-1 text-center">
          <div className="whitespace-nowrap">情感绑定</div>
          <div className="whitespace-nowrap">高频复购</div>
          <div className="whitespace-nowrap">社群裂变</div>
          <div className="whitespace-nowrap">非票增长</div>
        </div>
      </div>

      <div className="border-2 border-amber-300 rounded-2xl bg-amber-50 p-4">
        <div className="font-bold text-amber-800 text-xl mb-3 whitespace-nowrap">演员 IP</div>
        <div className="grid grid-cols-2 gap-2 text-xs font-bold text-gray-700">
          {['卡司差异', 'CP组合', '近距互动', '粉丝陪伴', '二创传播', '刷卡司'].map((x) => (
            <div key={x} className="bg-white border rounded px-2 py-2 text-center whitespace-nowrap">{x}</div>
          ))}
        </div>
      </div>
    </div>
  </div>
</Canvas>
```

## Chart 08
```jsx
<Canvas>
  <div className="w-full h-full flex flex-col px-6 py-4">
    <div className="text-center mb-4 text-2xl font-bold text-blue-900 whitespace-nowrap">用户生命周期成长路径</div>

    <div className="grid grid-cols-4 gap-3 h-[470px]">
      {[
        ['泛受众', '看热闹', '内容种草', '首次到店'],
        ['初级粉丝', '要互动', '触点优化', '形成认同'],
        ['核心粉丝', '要归属', '会员排期', '持续复购'],
        ['死忠会员', '要共创', '特权激励', '品牌布道'],
      ].map((s, i) => (
        <div key={i} className={`${i === 3 ? 'bg-blue-900 text-white' : i === 2 ? 'bg-blue-100' : i === 1 ? 'bg-blue-50' : 'bg-gray-100'} border rounded-xl p-4 flex flex-col justify-between`}>
          <div className="font-bold text-lg text-center whitespace-nowrap">{s[0]}</div>
          <div className="text-sm space-y-2">
            <div className="whitespace-nowrap">诉求：{s[1]}</div>
            <div className="whitespace-nowrap">动作：{s[2]}</div>
          </div>
          <div className="text-sm font-bold text-center bg-black/10 rounded py-2 whitespace-nowrap">结果：{s[3]}</div>
        </div>
      ))}
    </div>
  </div>
</Canvas>
```

## Chart 10
```jsx
<Canvas>
  <div className="relative w-full h-full p-8">
    <div className="absolute left-20 bottom-16 right-14 h-[2px] bg-slate-500"></div>
    <div className="absolute left-20 top-16 bottom-16 w-[2px] bg-slate-500"></div>

    <div className="absolute right-12 bottom-[58px] border-y-[7px] border-l-[12px] border-transparent border-l-slate-500"></div>
    <div className="absolute left-[14px] top-[58px] border-x-[7px] border-b-[12px] border-transparent border-b-slate-500"></div>

    <div className="absolute left-1/2 -translate-x-1/2 bottom-6 text-sm font-bold text-slate-600 whitespace-nowrap">内部能力成熟度（高）</div>
    <div className="absolute left-4 top-1/2 -translate-y-1/2 -rotate-90 text-sm font-bold text-slate-600 whitespace-nowrap">外部扩张压力（高）</div>

    <div className="absolute left-24 right-16 top-20 bottom-20 grid grid-cols-2 grid-rows-2 gap-3">
      {[
        ['全国扩张适配', '复制模型要适配城市差异'],
        ['出海与文化转译', '本地化改编与长期运营能力'],
        ['人才供给与品控', '扩张速度与互动品质平衡'],
        ['原创与版权结构', '从引进到原创体系化能力'],
      ].map((x, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="font-bold text-gray-800 whitespace-nowrap">{x[0]}</div>
          <div className="text-sm text-gray-600 mt-2">{x[1]}</div>
        </div>
      ))}
    </div>

    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[58%] bg-blue-900 text-white px-5 py-2 rounded-full font-bold text-sm whitespace-nowrap">核心挑战：从爆款逻辑到系统能力</div>
  </div>
</Canvas>
```

## Chart 14
```jsx
<Canvas>
  <div className="w-full h-full flex flex-col justify-center px-6">
    <div className="relative h-28 w-full mb-5 px-6">
      <svg className="w-full h-full overflow-visible" viewBox="0 0 820 120" preserveAspectRatio="none">
        <path d="M 20 92 C 95 92, 120 62, 200 62 C 280 62, 320 82, 410 82 C 500 82, 540 20, 620 20 C 700 20, 740 45, 800 45" fill="none" stroke="#0d9488" strokeWidth="5" strokeLinecap="round" />
        <circle cx="200" cy="62" r="7" fill="#0d9488" />
        <circle cx="620" cy="20" r="9" fill="#ca8a04" />
        <circle cx="800" cy="45" r="7" fill="#0d9488" />
      </svg>
    </div>

    <div className="grid grid-cols-4 gap-3">
      {[
        ['1认知', '安利/短视频'], ['2种草', '口碑/热梗'], ['3购票', '查卡司/抢票'], ['4到场', '打卡/候场'],
        ['5观演', '近距互动'], ['6离场', 'SD/周边'], ['7分享', '二创/晒单'], ['8再购', '刷卡司/会员'],
      ].map((x, i) => (
        <div key={i} className={`p-3 rounded-lg border text-center ${i === 4 || i === 7 ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'}`}>
          <div className="font-bold whitespace-nowrap">{x[0]}</div>
          <div className="text-xs text-gray-600 mt-1 whitespace-nowrap">{x[1]}</div>
        </div>
      ))}
    </div>
  </div>
</Canvas>
```

## Chart 16
```jsx
<Canvas>
  <div className="relative w-full h-full p-10">
    <div className="absolute top-3 left-1/2 -translate-x-1/2 text-xl font-bold text-gray-800 whitespace-nowrap">RFM 用户分层气泡图</div>

    <div className="absolute left-16 top-14 bottom-24 border-l-2 border-slate-500"></div>
    <div className="absolute left-16 right-14 bottom-24 border-b-2 border-slate-500"></div>
    <div className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 text-sm font-bold text-slate-600 whitespace-nowrap">Recency（高）</div>
    <div className="absolute left-1/2 -translate-x-1/2 bottom-12 text-sm font-bold text-slate-600 whitespace-nowrap">Frequency（高）</div>

    <div className="absolute inset-0">
      <div className="absolute top-[24%] right-[22%] w-36 h-36 bg-blue-900/90 rounded-full text-white flex items-center justify-center text-center p-2 shadow-xl"><div><div className="font-bold">高价值核心粉</div><div className="text-[11px] whitespace-nowrap">深度运营</div></div></div>
      <div className="absolute top-[40%] right-[42%] w-28 h-28 bg-blue-600/85 rounded-full text-white flex items-center justify-center text-center p-2 shadow-md"><div><div className="font-bold text-sm">稳定复购客</div><div className="text-[10px] whitespace-nowrap">会员权益</div></div></div>
      <div className="absolute top-[30%] left-[30%] w-24 h-24 bg-teal-500/85 rounded-full text-white flex items-center justify-center text-center p-2 shadow-md"><div><div className="font-bold text-xs">新客尝鲜者</div><div className="text-[10px] whitespace-nowrap">首购激励</div></div></div>
      <div className="absolute top-[64%] left-[45%] w-20 h-20 bg-yellow-500/85 rounded-full text-white flex items-center justify-center text-center p-1"><div><div className="font-bold text-xs">偶发观众</div></div></div>
      <div className="absolute bottom-[32%] left-[25%] w-16 h-16 bg-gray-400/85 rounded-full text-white flex items-center justify-center text-center p-1"><div><div className="font-bold text-[10px]">沉睡</div></div></div>
    </div>

    <div className="absolute right-6 bottom-2 border border-gray-200 bg-white px-3 py-2 rounded-lg shadow-sm text-xs text-gray-600">
      <div className="font-bold text-gray-800 whitespace-nowrap">气泡大小 = Monetary</div>
    </div>
  </div>
</Canvas>
```

## Chart 18
```jsx
<Canvas>
  <div className="w-full h-full grid grid-cols-[360px_1fr] gap-6 px-6 py-4">
    <div className="relative flex items-center justify-center">
      <div className="group absolute w-[320px] h-[320px] rounded-full bg-blue-900 border-4 border-white text-white flex flex-col items-center justify-start pt-8">
        <div className="text-3xl font-bold">70%</div>
        <div className="text-sm mt-1 whitespace-nowrap">实战演出轮换</div>
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition bg-white text-gray-800 text-xs px-2 py-1 rounded border shadow whitespace-nowrap">高频上台，快速成长</div>
      </div>
      <div className="group absolute w-[220px] h-[220px] rounded-full bg-blue-600 border-4 border-white text-white flex flex-col items-center justify-start pt-6">
        <div className="text-2xl font-bold">20%</div>
        <div className="text-xs mt-1 whitespace-nowrap">导师复盘辅导</div>
        <div className="absolute -top-9 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition bg-white text-gray-800 text-xs px-2 py-1 rounded border shadow whitespace-nowrap">演后复盘，稳定质量</div>
      </div>
      <div className="group absolute w-[120px] h-[120px] rounded-full bg-teal-500 border-4 border-white text-white flex flex-col items-center justify-center">
        <div className="text-xl font-bold">10%</div>
        <div className="text-[11px] whitespace-nowrap">正式培训</div>
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition bg-white text-gray-800 text-xs px-2 py-1 rounded border shadow whitespace-nowrap">打基础能力</div>
      </div>
    </div>

    <div className="flex flex-col justify-center gap-4">
      <h3 className="text-2xl font-bold text-gray-800 whitespace-nowrap">721 人才培养模型</h3>
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"><div className="font-bold text-blue-900 whitespace-nowrap">70% 实战演出</div><div className="text-sm text-gray-600 mt-1">高频轮换，真实互动训练。</div></div>
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"><div className="font-bold text-blue-700 whitespace-nowrap">20% 导师复盘</div><div className="text-sm text-gray-600 mt-1">复盘纠偏，维持品控。</div></div>
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"><div className="font-bold text-teal-700 whitespace-nowrap">10% 正式培训</div><div className="text-sm text-gray-600 mt-1">声台形表与职业规范。</div></div>
    </div>
  </div>
</Canvas>
```
