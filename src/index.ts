import * as dotenv from 'dotenv'
dotenv.config()
import logger from "@/utils/logger";


logger.debug("hello");

import { RemoteRunnable } from "langchain/runnables/remote";

async function getLlama3() {
    const chain = new RemoteRunnable({
        url: process.env.API_ENDPOINT + "/llama3",
    });

    const result = await chain.invoke({
        input: "こんにちは！今日は何曜日ですか？",
        past_chats_context: " ",
        today_history: []
    });
    console.log(result);
}

async function streamLlama3() {
    const chain = new RemoteRunnable({
        url: process.env.API_ENDPOINT + "/llama3",
    });

    const stream = await chain.stream({
        input: "こんにちは！今日は何曜日ですか？",
        past_chats_context: " ",
        today_history: []
    });

    for await (const chunk of stream) {
        process.stdout.write(chunk as Buffer);
    }
}

getLlama3();
// streamLlama3();