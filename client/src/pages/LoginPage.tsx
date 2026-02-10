import { getAuthUrl } from "@/const";
import { AUTH_PROVIDERS, type AuthProvider } from "@shared/types";
import { useSearch } from "wouter";

export default function LoginPage() {
  const searchParams = useSearch();
  const params = new URLSearchParams(searchParams);
  const redirectParam = params.get("redirect") || "/";

  const handleAuth = (provider: AuthProvider) => {
    const authUrl = getAuthUrl(provider, redirectParam);
    window.location.href = authUrl;
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f9fafb',
      padding: '16px'
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
            MeDF Hub
          </h1>
          <p style={{ color: '#6b7280' }}>
            認証プロバイダーを選択してください
          </p>
        </div>

        {/* Auth Buttons */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <button
            onClick={() => handleAuth("google")}
            style={{
              width: '100%',
              padding: '16px',
              marginBottom: '12px',
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px'
            }}
          >
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>G</span>
            <span>Googleでログイン</span>
          </button>

          <button
            onClick={() => handleAuth("github")}
            style={{
              width: '100%',
              padding: '16px',
              backgroundColor: '#111827',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px'
            }}
          >
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>GH</span>
            <span>GitHubでログイン</span>
          </button>

          <button
            onClick={() => handleAuth("manus")}
            disabled
            style={{
              width: '100%',
              padding: '16px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'not-allowed',
              fontSize: '14px',
              fontWeight: '500',
              opacity: 0.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px'
            }}
          >
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>M</span>
            <span>Manusでログイン（準備中）</span>
          </button>
        </div>

        {/* Help Text */}
        <p style={{ textAlign: 'center', fontSize: '12px', color: '#9ca3af', marginTop: '24px' }}>
          ログインすることで、利用規約とプライバシーポリシーに同意したものとみなされます。
        </p>
      </div>
    </div>
  );
}
