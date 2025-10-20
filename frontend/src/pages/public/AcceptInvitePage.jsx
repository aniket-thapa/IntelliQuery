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

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isTokenInvalid, setIsTokenInvalid] = useState(false);
  const [isTokenValidating, setIsTokenValidating] = useState(true);
  const [decodedToken, setDecodedToken] = useState(null);

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
    try {
      const decoded = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      if (decoded.exp < currentTime) {
        toast.error('Invitation Expired', {
          description:
            'This invitation link has expired. Please ask for a new one.',
        });
        setIsTokenInvalid(true);
      } else {
        setDecodedToken(decoded);
      }
    } catch (err) {
      toast.error('Invalid Invitation', {
        description:
          'This invitation link is invalid or has already been used.',
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
      await api.post('/auth/accept-invite', { token, password });
      toast.success('Invitation Accepted!', {
        description: 'Your account has been created. Redirecting to login...',
      });
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error accepting invitation.');
      if (err.response?.status === 400 || err.response?.status === 409) {
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
              <CardTitle className="text-2xl">Invitation Invalid</CardTitle>
              <CardDescription>
                This link may be expired or has already been used.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild className="w-full">
                <Link to="/login">Return to Login</Link>
              </Button>
            </CardFooter>
          </>
        ) : (
          <>
            <CardHeader>
              <CardTitle className="text-2xl">Accept Invitation</CardTitle>
              <CardDescription>
                {decodedToken?.inviterName
                  ? `You've been invited by ${decodedToken.inviterName}. `
                  : "You've been invited to join. "}
                Set a password for your account.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent>
                <div className="grid gap-2 text-left">
                  <Label htmlFor="password">Password</Label>
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
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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
              <CardFooter>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && (
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {loading ? 'Creating Account...' : 'Accept & Create Account'}
                </Button>
              </CardFooter>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
