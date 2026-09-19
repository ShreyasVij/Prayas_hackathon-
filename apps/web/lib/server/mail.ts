import { sendEmail } from './email';

export interface SendMailParams {
  to: string | string[];
  subject: string;
  html: string;
  fromName?: string;
}

export async function sendMail(params: SendMailParams): Promise<any> {
  return sendEmail({
    to: params.to,
    subject: params.subject,
    template: 'custom' as any,
    data: { html: params.html },
  });
}
