import React from 'react';
import {
  Building2,
  Users,
  Map,
  Star,
  ArrowRight,
  Layers,
  MessageSquare,
  Heart,
  Search,
  Target,
  ArrowDown,
  RefreshCcw,
  ChevronRight,
  PlayCircle,
  MonitorSmartphone,
} from 'lucide-react';

const Canvas = ({ children }: { children: React.ReactNode }) => (
  <div style={{ width: '1000px', height: '650px' }}>{children}</div>
);

export default function Tmp() {
  return (
    <>
      <Canvas>
        <div className="relative w-full h-full p-8">
          <div className="absolute left-16 top-10 bottom-16 border-l-2 border-slate-500"></div>
          <div className="absolute left-16 right-12 bottom-16 border-b-2 border-slate-500"></div>
          <div className="absolute right-8 bottom-[54px] border-t-[10px] border-b-[10px] border-l-[14px] border-transparent border-l-slate-500"></div>
          <div className="absolute inset-0"></div>
        </div>
      </Canvas>
      <Canvas>
        <div className="w-full h-full grid grid-cols-[1.05fr_0.95fr] gap-8 px-8 py-4">
          <div className="space-y-4"><h3>t</h3></div>
          <div className="flex justify-center items-end"><div className="w-72 h-[470px]"></div></div>
        </div>
      </Canvas>
      <Canvas>
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="relative w-[820px] h-[430px]">
            {[
              { t: '1 场景实景化', d: '酒馆化', x: '50%', y: '8%' },
              { t: '2 物理距离近', d: '近距离', x: '76%', y: '20%' },
            ].map((n, i) => (
              <div key={i} className="absolute -translate-x-1/2 -translate-y-1/2 w-32" style={{ left: n.x, top: n.y }}>
                <div className="whitespace-nowrap">{n.t}</div>
              </div>
            ))}
          </div>
        </div>
      </Canvas>
      <Canvas>
        <div className="w-full h-full grid grid-cols-[300px_1fr] gap-6 px-6 py-4">
          <div className="flex items-center justify-center"><ArrowRight /></div>
          <div className="grid grid-rows-5 gap-3"></div>
        </div>
      </Canvas>
      <Canvas>
        <div className="w-full h-full flex flex-col px-6 py-4">
          <div className="grid grid-cols-[1fr_220px_1fr] gap-4 h-[450px]">
            <div><RefreshCcw /></div>
            <div><div className="whitespace-nowrap">飞轮结果</div></div>
            <div><div className="whitespace-nowrap">演员 IP</div></div>
          </div>
        </div>
      </Canvas>
      <Canvas>
        <div className="w-full h-full flex flex-col px-6 py-4">
          <div className="grid grid-cols-4 gap-3 h-[470px]"></div>
        </div>
      </Canvas>
      <Canvas>
        <div className="relative w-full h-full p-8">
          <div className="absolute left-20 bottom-16 right-14 h-[2px] bg-slate-500"></div>
          <div className="absolute left-20 top-16 bottom-16 w-[2px] bg-slate-500"></div>
          <div className="absolute right-12 bottom-[58px] border-y-[7px] border-l-[12px] border-transparent border-l-slate-500"></div>
          <div className="absolute left-[14px] top-[58px] border-x-[7px] border-b-[12px] border-transparent border-b-slate-500"></div>
        </div>
      </Canvas>
      <Canvas>
        <div className="w-full h-full flex flex-col justify-center px-6">
          <div className="relative h-28 w-full mb-5 px-6">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 820 120" preserveAspectRatio="none">
              <path d="M 20 92 C 95 92, 120 62, 200 62 C 280 62, 320 82, 410 82 C 500 82, 540 20, 620 20 C 700 20, 740 45, 800 45" fill="none" stroke="#0d9488" strokeWidth="5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </Canvas>
      <Canvas>
        <div className="relative w-full h-full p-10">
          <div className="absolute right-6 bottom-2 border border-gray-200 bg-white px-3 py-2 rounded-lg shadow-sm text-xs text-gray-600">
            <div className="font-bold text-gray-800 whitespace-nowrap">气泡大小 = Monetary</div>
          </div>
        </div>
      </Canvas>
      <Canvas>
        <div className="w-full h-full grid grid-cols-[360px_1fr] gap-6 px-6 py-4">
          <div className="relative flex items-center justify-center">
            <div className="group absolute w-[320px] h-[320px] rounded-full bg-blue-900 border-4 border-white text-white flex flex-col items-center justify-start pt-8">
              <div className="text-3xl font-bold">70%</div>
            </div>
          </div>
        </div>
      </Canvas>
      <Building2 />
      <Users />
      <Map />
      <Star />
      <Layers />
      <MessageSquare />
      <Heart />
      <Search />
      <Target />
      <ArrowDown />
      <ChevronRight />
      <PlayCircle />
      <MonitorSmartphone />
    </>
  );
}
