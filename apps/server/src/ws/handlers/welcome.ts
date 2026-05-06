import { WelcomeMessage } from "../../types/ws";

/**
 * Handle welcome message
 * @param ws WebSocket connection
 * @param message Welcome message
 */
export function handleWelcome(ws: any, message: WelcomeMessage) {
    // Send welcome message
    const welcomeMsg = {
        type: "welcome",
        message: "Connected to ControlX Server",
    };
    console.log(
        "Sending welcome message to client:",
        JSON.stringify(welcomeMsg)
    );
    ws.send(JSON.stringify(welcomeMsg));
}
