export function createOAuth2Client(tokens?: any): any {
  return {
    setCredentials: () => {},
    credentials: tokens || {},
  };
}

export async function createCalendarEvent(oauth2Client: any, details: any): Promise<any> {
  return { id: `event_${Date.now()}`, ...details };
}

export async function deleteCalendarEvent(oauth2Client: any, eventId: string): Promise<any> {
  return { success: true, eventId };
}

export async function refreshTokensIfNeeded(tokens: any): Promise<any> {
  return tokens;
}
