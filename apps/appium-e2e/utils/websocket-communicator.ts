import WebSocket from "ws";

class WebSocketCommunicator {
    private wsClient: WebSocket | null = null;
    private messages: string[] = [];
    private port: number | null = null;

    async connect(port: number): Promise<WebSocket> {
        return new Promise((resolve, reject) => {
            this.port = port;
            const wsUrl = `ws://localhost:${port}`;
            console.log(`🔌 Connecting to WebSocket server: ${wsUrl}`);
            
            this.wsClient = new WebSocket(wsUrl);
            
            this.wsClient.on('open', () => {
                console.log("✅ WebSocket connected");
                resolve(this.wsClient!);
            });
            
            this.wsClient.on('message', (data) => {
                const message = data.toString();
                this.messages.push(message);
                console.log(`[WS Received] ${message}`);
            });
            
            this.wsClient.on('error', (error) => {
                console.error(`[WS Error] ${error.message}`);
                reject(error);
            });
            
            this.wsClient.on('close', () => {
                console.log("[WS] Connection closed");
            });
            
            setTimeout(() => {
                if (this.wsClient && this.wsClient.readyState !== WebSocket.OPEN) {
                    reject(new Error("WebSocket connection timeout"));
                }
            }, 5000);
        });
    }

    async sendMessage(message: any): Promise<boolean> {
        if (!this.wsClient || this.wsClient.readyState !== WebSocket.OPEN) {
            throw new Error("WebSocket not connected");
        }
        
        const jsonMessage = JSON.stringify(message);
        this.wsClient.send(jsonMessage);
        console.log(`[WS Sent] ${jsonMessage}`);
        return true;
    }

    disconnect(): void {
        if (this.wsClient) {
            this.wsClient.close();
            this.wsClient = null;
            console.log("✅ WebSocket disconnected");
        }
    }

    isConnected(): boolean {
        return this.wsClient !== null && this.wsClient.readyState === WebSocket.OPEN;
    }

    getMessages(): string[] {
        return this.messages;
    }
}

export default WebSocketCommunicator;