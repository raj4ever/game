import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500">
      <main className="flex flex-col items-center justify-center text-center p-8">
        <h1 className="text-5xl font-bold text-white mb-4">🎯 Treasure Hunt Game</h1>
        <p className="text-xl text-white/90 mb-8 max-w-md">
          Find the hidden treasure using GPS! Navigate to the target location and reveal your prize.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            href="/game"
            className="px-8 py-4 bg-white text-purple-600 rounded-full font-bold text-lg hover:bg-gray-100 transition shadow-lg"
          >
            🎮 Play Game
          </Link>
          <Link
            href="/admin"
            className="px-8 py-4 bg-black/30 text-white rounded-full font-bold text-lg hover:bg-black/40 transition shadow-lg border-2 border-white/30"
          >
            ⚙️ Admin Panel
          </Link>
        </div>
      </main>
    </div>
  );
}
