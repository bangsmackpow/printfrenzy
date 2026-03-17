// src/app/page.tsx
import { redirect } from 'next/navigation';

export default function Home() {
  // Automatically send everyone to the printer dashboard
  redirect('/dashboard');
}