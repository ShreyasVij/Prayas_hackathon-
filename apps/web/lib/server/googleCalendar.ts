export function createOAuth2Client(tokens?: any): any {
  return {
    setCredentials: () => {},
    credentials: tokens || {},
  };
}

export async function createCalendarEvent(...args: any[]): Promise<any> {
  return `event_${Date.now()}`;
}

export async function deleteCalendarEvent(...args: any[]): Promise<any> {
  return { success: true };
}

export async function refreshTokensIfNeeded(tokens: any): Promise<any> {
  return tokens;
}
