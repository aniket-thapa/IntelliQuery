import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import api from '../../lib/api';
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
import { toast } from 'sonner';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isTokenInvalid, setIsTokenInvalid] = useState(false);
  const [isTokenValidating, setIsTokenValidating] = useState(true);

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
    try {
      const decodedToken = jwtDecode(token);
      const currentTime = Date.now() / 1000;

      if (decodedToken.exp < currentTime) {
        toast.error('Link Expired', {
          description:
            'Your password reset link has expired. Please request a new one.',
        });
        setIsTokenInvalid(true);
      }
    } catch (err) {
      toast.error('Invalid Link', {
        description: 'This password reset link is invalid.',
      });
      setIsTokenInvalid(true);
    } finally {
      setIsTokenValidating(false);
    }
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword });
      toast.success('Password Reset!', {
        description: 'Your password has been changed. Redirecting to login...',
      });
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error resetting password.');
      if (err.response?.data?.error.toLowerCase().includes('expired')) {
        setIsTokenInvalid(true);
      }
    } finally {
      setLoading(false);
    }
  };

  if (isTokenValidating) {
    return (
      <div>
        <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto flex items-center justify-center">
      <Card className="w-full bg-background/50 border-white/10 backdrop-blur-lg">
        {isTokenInvalid ? (
          <>
            <CardHeader>
              <CardTitle className="text-2xl">Link Invalid</CardTitle>
              <CardDescription>
                This password reset link is no longer valid.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex flex-col gap-4 mt-4">
              <Button asChild className="w-full">
                <Link to="/forgot-password">Request a New Link</Link>
              </Button>
            </CardFooter>
          </>
        ) : (
          <>
            <CardHeader>
              <CardTitle className="text-2xl">Reset Password</CardTitle>
              <CardDescription>Enter your new password below.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="grid gap-4">
                <div className="grid gap-2 text-left">
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4 mt-4">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && (
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {loading ? 'Resetting...' : 'Reset Password'}
                </Button>
              </CardFooter>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
