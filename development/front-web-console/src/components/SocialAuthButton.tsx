type SocialAuthProvider = 'google' | 'kakao';

type SocialAuthButtonProps = {
  provider: SocialAuthProvider;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
};

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="social-auth-button__icon" viewBox="0 0 18 18">
      <path
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.56 2.68-3.86 2.68-6.62Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H1.96v2.33A8.997 8.997 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.97 10.71A5.41 5.41 0 0 1 3.69 9c0-.59.1-1.15.28-1.71V4.96H1.96a9 9 0 0 0 0 8.08l2.01-2.33Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.32 0 2.5.45 3.43 1.33l2.58-2.58C13.46.89 11.43 0 9 0A8.997 8.997 0 0 0 1.96 4.96l2.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function KakaoMark() {
  return (
    <svg aria-hidden="true" className="social-auth-button__icon" viewBox="0 0 18 18">
      <path
        d="M9 2.5c-3.73 0-6.75 2.35-6.75 5.25 0 1.87 1.25 3.51 3.13 4.44l-.79 2.91c-.08.31.26.56.53.39l3.48-2.3c.13.01.26.01.4.01 3.73 0 6.75-2.35 6.75-5.25S12.73 2.5 9 2.5Z"
        fill="#000000"
      />
    </svg>
  );
}

function SocialAuthIcon({ provider }: { provider: SocialAuthProvider }) {
  if (provider === 'google') {
    return <GoogleMark />;
  }
  return <KakaoMark />;
}

// Brand rules: Google uses a white surface with the standard-color G logo.
// Kakao uses #FEE500 with the black talk-bubble symbol and label text.
export function SocialAuthButton({
  provider,
  label,
  onClick,
  disabled = false,
  fullWidth = true,
}: SocialAuthButtonProps) {
  const className = [
    'social-auth-button',
    `social-auth-button--${provider}`,
    fullWidth ? 'social-auth-button--full-width' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      aria-label={label}
      className={className}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <span className="social-auth-button__icon-wrap">
        <SocialAuthIcon provider={provider} />
      </span>
      <span className="social-auth-button__label">{label}</span>
    </button>
  );
}
