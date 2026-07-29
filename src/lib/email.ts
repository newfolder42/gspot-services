"use server";

import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { FROM_NAME, unseenNotificationEmail } from "./emailTemplates";

type EmailProvider = 'ses' | 'resend' | 'console';

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text: string | null;
    headers?: Record<string, string>;
}

const SELECTED_PROVIDER: EmailProvider = (process.env.EMAIL_PROVIDER || 'console') as EmailProvider;
const FROM_EMAIL = 'notifications@gspot.ge';

function resolveProvider(): EmailProvider {
    if (SELECTED_PROVIDER === 'ses' && !(process.env.AWSSES_ACCESS_KEY_ID && process.env.AWSSES_SECRET_ACCESS_KEY)) {
        return 'console';
    }
    if (SELECTED_PROVIDER === 'resend' && !process.env.EMAIL_PROVIDER_KEY) {
        return 'console';
    }
    return SELECTED_PROVIDER;
}

async function sendViaConsole(options: EmailOptions): Promise<void> {
    console.log('📧 [EMAIL - Console Mode]');
    console.log('To:', options.to);
    console.log('Subject:', options.subject);
    console.log('HTML:', options.html);
    console.log('Text:', options.text || '');
    console.log('---');
}

let sesClient: SESv2Client | null = null;

function getSESClient(): SESv2Client {
    if (!sesClient) {
        sesClient = new SESv2Client({
            region: process.env.AWS_REGION,
            credentials: {
                accessKeyId: process.env.AWSSES_ACCESS_KEY_ID!,
                secretAccessKey: process.env.AWSSES_SECRET_ACCESS_KEY!,
            },
        });
    }
    return sesClient;
}

async function sendViaSES(options: EmailOptions): Promise<void> {
    const command = new SendEmailCommand({
        FromEmailAddress: `${FROM_NAME} <${FROM_EMAIL}>`,
        Destination: {
            ToAddresses: [options.to],
        },
        Content: {
            Simple: {
                Subject: { Data: options.subject, Charset: 'UTF-8' },
                Body: {
                    Html: { Data: options.html, Charset: 'UTF-8' },
                    ...(options.text ? { Text: { Data: options.text, Charset: 'UTF-8' } } : {}),
                },
                ...(options.headers
                    ? { Headers: Object.entries(options.headers).map(([Name, Value]) => ({ Name, Value })) }
                    : {}),
            },
        },
    });

    await getSESClient().send(command);
}

async function sendViaResend(options: EmailOptions): Promise<void> {
    const key = process.env.EMAIL_PROVIDER_KEY;

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: `${FROM_NAME} <${FROM_EMAIL}>`,
            to: [options.to],
            subject: options.subject,
            html: options.html,
            text: options.text,
            ...(options.headers ? { headers: options.headers } : {}),
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Resend API error: ${error}`);
    }
}

async function sendEmail(options: EmailOptions): Promise<boolean> {
    try {
        switch (resolveProvider()) {
            case 'ses':
                await sendViaSES(options);
                break;
            case 'resend':
                await sendViaResend(options);
                break;
            case 'console':
            default:
                await sendViaConsole(options);
                break;
        }
        return true;
    } catch (err) {
        console.log('sendEmail error', err);
        return false;
    }
}

export async function sendUnseenNotification(email: string, notificationText: string, path: string | null): Promise<boolean> {
    return sendEmail({ to: email, ...unseenNotificationEmail(notificationText, path) });
}
