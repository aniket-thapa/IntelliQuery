import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Lock, LoaderCircle, Eye, EyeOff } from 'lucide-react';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If no token in URL, prevent direct access and redirect to request-password page
    if (!token) {
      navigate('/request-password-reset', { replace: true });
      return;
    }
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const res = await api.post('/auth/reset-password', {
        token,
        newPassword,
      });
      if (res.data.status) {
        setMessage('Password reset successfully! Redirecting to login...');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(res.data.error || 'Invalid or expired token.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error resetting password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <CardDescription>Enter your new password below.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Lock
                  strokeWidth={1.5}
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"
                />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded-md p-1 text-muted-foreground hover:bg-accent/20 focus:outline-none focus:ring focus:ring-ring cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff strokeWidth={1.5} className="h-4 w-4" />
                  ) : (
                    <Eye strokeWidth={1.5} className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 mt-4">
            {message && <p className="text-sm text-green-500">{message}</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              )}
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Don't want to reset?{' '}
              <Link to="/login" className="underline hover:text-primary">
                Login
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
