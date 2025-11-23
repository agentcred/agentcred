import { MsgCore } from '@msgcore/sdk';

export class NotificationService {
    private msc: MsgCore | null = null;
    private platformId: string;
    private channelId: string;

    constructor() {
        const apiKey = process.env.MSGCORE_API_KEY;
        this.platformId = process.env.MSGCORE_PLATFORM_ID || 'discord';
        this.channelId = process.env.MSGCORE_CHANNEL_ID || '';

        if (apiKey) {
            this.msc = new MsgCore({
                apiUrl: process.env.MSGCORE_API_URL || '',
                apiKey: apiKey,
                defaultProject: process.env.MSGCORE_PROJECT_ID,
            });
            console.log("MsgCore initialized");
        } else {
            console.warn("MSGCORE_API_KEY not set, notifications disabled");
        }
    }

    async notify(message: string) {
        if (!this.msc || !this.channelId) {
            console.log("Notification skipped (not configured):", message);
            return;
        }

        try {
            await this.msc.messages.send({
                targets: [{ platformId: this.platformId, type: 'channel' as any, id: this.channelId }],
                content: { text: message },
            });
            console.log("Notification sent:", message);
        } catch (error) {
            console.error("Failed to send notification:", error);
        }
    }
}

export const notificationService = new NotificationService();
