export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(160deg,_#08111d,_#0f1728_52%,_#111827)] px-6 text-slate-100">
      <div className="max-w-lg rounded-[2rem] border border-white/10 bg-[#0e1627]/85 p-8 text-center shadow-[0_20px_70px_rgba(7,10,23,0.42)]">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/70">404</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">页面不存在</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          当前地址没有对应的管理端页面，请返回主界面继续使用。
        </p>
      </div>
    </main>
  );
}
