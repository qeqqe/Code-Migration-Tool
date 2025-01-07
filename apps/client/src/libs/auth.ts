const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001/api';
export const handleGithubLogin = async () => {
  try {
    console.log(`Starting fetching the url`);
    const response = await fetch(`${BACKEND_URL}/auth/github`);
    if (!response.ok) {
      return console.error('Unable to fetch');
    }
    const { url } = await response.json();
    console.log(`got the url ${url}`);
    window.location.href = url;
  } catch (error) {
    console.error('Failed to initiate GitHub login:', error);
  }
};
