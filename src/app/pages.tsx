// src/app/page.tsx
import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold mb-4">PrintFrenzy</h1>
      <Link href="/dashboard" className="text-blue-600 underline">
        Go to Printer Dashboard
      </Link>
    </div>
  );
}