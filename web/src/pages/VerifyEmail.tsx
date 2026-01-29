import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/hooks/useAuthStore';

export function VerifyEmailPage() {
  const { user, sendVerificationEmail } = useAuthStore();
  const navigate = useNavigate();

  const handleResend = async () => {
    try {
      await sendVerificationEmail();
      alert('Verification email sent!');
    } catch {
      alert('Failed to send email. Please try again.');
    }
  };

  const handleCheckVerification = () => {
    window.location.reload();
  };

  if (user?.emailVerified) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="card p-8">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          <h2 className="text-xl font-semibold mb-2">Verify your email</h2>
          <p className="text-gray-600 mb-6">
            We've sent a verification link to <strong>{user?.email}</strong>.
            Please check your inbox and click the link to verify your account.
          </p>

          <div className="space-y-3">
            <button onClick={handleCheckVerification} className="btn-primary w-full">
              I've verified my email
            </button>
            <button onClick={handleResend} className="btn-secondary w-full">
              Resend verification email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
