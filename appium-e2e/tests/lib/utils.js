const readline = require("readline");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function log(message) {
    console.log(`[${new Date().toISOString().substring(11, 23)}] ${message}`);
}

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, (answer) => {
            resolve(answer.trim());
        });
    });
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function closeReadline() {
    rl.close();
}

module.exports = { log, question, delay, closeReadline };
