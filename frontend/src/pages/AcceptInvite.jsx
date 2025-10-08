import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import api from '../lib/api';
import Header from '../components/Header';
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
import { Lock, LoaderCircle, Eye, EyeOff, MailWarning } from 'lucide-react';

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTokenInvalid, setIsTokenInvalid] = useState(false);
  const [isTokenValidating, setIsTokenValidating] = useState(true);
  const [inviter, setInviter] = useState('');

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
    try {
      const decodedToken = jwtDecode(token);
      const currentTime = Date.now() / 1000;

      if (decodedToken.exp < currentTime) {
        setError('Your invitation link has expired. Please ask for a new one.');
        setIsTokenInvalid(true);
      } else {
        // You can optionally decode inviter info to personalize the page
        if (decodedToken.inviterName) {
          setInviter(decodedToken.inviterName);
        }
      }
    } catch (err) {
      setError(
        'This invitation link is invalid. Please check the link or ask for a new one.'
      );
      console.error(err.message);
      setIsTokenInvalid(true);
    } finally {
      setIsTokenValidating(false);
    }
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const res = await api.post('/auth/accept-invite', {
        token,
        newPassword,
      });
      if (res.data.status) {
        setMessage('Invitation accepted successfully! Redirecting to login...');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(res.data.error || 'Invalid or expired invitation link.');
        setIsTokenInvalid(true);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error accepting the invitation.');
      if (err.response?.data?.error.toLowerCase().includes('expired')) {
        setIsTokenInvalid(true);
      }
    } finally {
      setLoading(false);
    }
  };

  if (isTokenValidating) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4">
          <Card className="w-full max-w-sm bg-black/30">
            <CardContent className="flex justify-center items-center p-10">
              <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (isTokenInvalid) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4">
          <Card className="w-full max-w-sm bg-black/30">
            <CardHeader>
              <CardTitle className="text-2xl">Link Invalid</CardTitle>
              <CardDescription>
                This invitation link is no longer valid.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <p className="text-sm text-center text-destructive">{error}</p>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-4 mt-4">
              <Button asChild className="w-full">
                <Link to="/login">Return to Login</Link>
              </Button>
            </CardFooter>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4">
        <Card className="w-full max-w-sm bg-black/30">
          <CardHeader>
            <CardTitle className="text-2xl">Accept Invitation</CardTitle>
            <CardDescription>
              {inviter
                ? `You've been invited by ${inviter}. `
                : "You've been invited to join. "}
              Set a password to create your account.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="password">Set Password</Label>
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
                    aria-label={
                      showPassword ? 'Hide password' : 'Show password'
                    }
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
              {message && (
                <p className="text-sm text-green-500 text-center">{message}</p>
              )}
              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                )}
                {loading ? 'Accepting...' : 'Accept & Create Account'}
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="underline hover:text-primary">
                  Login
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}
