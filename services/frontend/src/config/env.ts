interface EnvConfig {
  aws: {
    region: string
    userPoolId: string
    userPoolClientId: string
    oauthDomain: string
    redirectSignIn: string
    redirectSignOut: string
  }
  api: {
    url: string
  }
  isDevelopment: boolean
  isProduction: boolean
}

export const config: EnvConfig = {
  aws: {
    region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
    userPoolId: import.meta.env.VITE_USER_POOL_ID || '',
    userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID || '',
    oauthDomain: import.meta.env.VITE_OAUTH_DOMAIN || '',
    redirectSignIn:
      import.meta.env.VITE_REDIRECT_SIGNIN || 'http://localhost:3000/',
    redirectSignOut:
      import.meta.env.VITE_REDIRECT_SIGNOUT || 'http://localhost:3000/login',
  },
  api: {
    url: import.meta.env.VITE_API_URL || '',
  },
  isDevelopment: import.meta.env.MODE === 'development',
  isProduction: import.meta.env.MODE === 'production',
}

// Validate critical configs on app start
if (config.isProduction && !config.aws.userPoolId) {
  throw new Error('Production requires AWS User Pool configuration')
}
