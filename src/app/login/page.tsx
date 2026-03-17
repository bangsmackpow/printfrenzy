"use client";
import { signIn } from "@auth/nextjs/react"; // Updated import
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.ok) {
      router.push("/dashboard");
    } else {
      alert("Invalid login");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">PrintFrenzy Login</h1>
        <div className="mb-4">
          <label className="block text-sm mb-1">Email</label>
          <input 
            type="email" 
            className="w-full border p-2 rounded" 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
        </div>
        <div className="mb-6">
          <label className="block text-sm mb-1">Password</label>
          <input 
            type="password" 
            className="w-full border p-2 rounded" 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
        </div>
        <button className="w-full bg-blue-600 text-white py-2 rounded font-bold">Sign In</button>
      </form>
    </div>
  );
}