import * as dotenv from 'dotenv'
dotenv.config()
import logger from "@/utils/logger";

import readlineSync from 'readline-sync';

import { RemoteRunnable } from "langchain/runnables/remote";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";

const createChain = () => {
    return new RemoteRunnable({
        url: process.env.API_ENDPOINT + "/llama3",
    });
};
const chain = createChain();


{
    const messageHistories: Record<string, InMemoryChatMessageHistory> = {};
    
    const withMessageHistory = new RunnableWithMessageHistory({
        runnable: chain,
        getMessageHistory: async (sessionId) => {
            if (messageHistories[sessionId] === undefined) {
                messageHistories[sessionId] = new InMemoryChatMessageHistory();
            }
            return messageHistories[sessionId];
        },
        historyMessagesKey: "today_history",
        inputMessagesKey: "input",
    });
    
    const config = {
        configurable: {
            sessionId: "test",
        },
    };
    
    const handleUserInput = async (input: string): Promise<void> => {
        process.stdout.write("\n")
        try {
            // チェーンを使って結果を取得
            const stream = await withMessageHistory.stream(
                {
                    input: input,
                    // past_chats_context: "",          
                },
                config
            );
    
            const result = []
            for await (const chunk of stream) {
                process.stdout.write(chunk as Buffer);
                // console.log((chunk as Buffer).toString())
                result.push(chunk)
            }
            
        } catch (error) {
            console.error('エラーが発生しました:', error);
        }
    };
    
    // CLIからの入力を待つループ
    const startChat = async() => {
        console.log('チャットを開始します。終了するには "exit" と入力してください。');
    
        while (true) {
            const input = readlineSync.question('\nあなた > ');
            if (input.toLowerCase() === 'exit') {
                break;
            }
            logger.debug(input)
            await handleUserInput(input);
        }
    };
    
    startChat();
}



async function getLlama3() {
    const result = await chain.invoke({
        input: "こんにちは！今日は何曜日ですか？",
        past_chats_context: " ",
        today_history: []
    });
    console.log(result);
}

async function streamLlama3() {
    const stream = await chain.stream({
        input: "こんにちは！今日は何曜日ですか？",
        past_chats_context: " ",
        today_history: []
    });

    for await (const chunk of stream) {
        process.stdout.write(chunk as Buffer);
    }
}

// getLlama3();
// streamLlama3();