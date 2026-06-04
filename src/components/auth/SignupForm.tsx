import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { hashPassword } from '@/lib/md5-auth';

export const SignupForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Dummy signup logic with hash example
    hashPassword(password);
    navigate('/dashboard');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input 
          type="email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded px-3 py-2" 
          required 
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Password</label>
        <input 
          type="password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded px-3 py-2" 
          required 
        />
      </div>
      <button type="submit" className="w-full bg-blue-600 text-white rounded py-2 hover:bg-blue-700">
        Sign Up
      </button>
    </form>
  );
};
