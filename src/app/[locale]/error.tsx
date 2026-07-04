"use client";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-red-500/30 bg-red-950/20 p-8 text-center">
      <h2 className="text-lg font-semibold text-red-200">页面加载出错</h2>
      <p className="mt-3 text-sm text-white/60">
        多为开发缓存损坏或端口不一致。请关闭所有 dev 终端，双击 start-dev.bat 重启，并只打开终端里显示的
        Local 地址。
      </p>
      <p className="mt-2 text-xs text-white/40">{error.message}</p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 rounded-full bg-gold px-6 py-2 text-sm font-bold text-ink"
      >
        重试
      </button>
    </div>
  );
}
