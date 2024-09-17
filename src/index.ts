import * as dotenv from 'dotenv'
dotenv.config()
import logger from "@/utils/logger";

import readlineSync from 'readline-sync';

import { RemoteRunnable } from "langchain/runnables/remote";
import { BaseChatMessageHistory, BaseListChatMessageHistory, InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { ChatPromptTemplate } from "@langchain/core/prompts";

const createChain = () => {
    return new RemoteRunnable({
        url: process.env.API_ENDPOINT + "/llama3",
    });
};
const chain = createChain();

// LangServe 側はllmを起動しているのみの場合
{
    // LangServe 側の例
    //
    //  add_routes(
    //      app,
    //      llm, # modelをそのまま入れる
    //      path="/llama3"
    //  )

    const prompt = ChatPromptTemplate.fromMessages([
        [
            "system", `あなたは私が送ったメッセージをすべて覚えている親切なAIアシスタントです。`,
        ],
        ["placeholder", "{chat_history}"],
        // この placeholder は以下のコードを実装するのと同じ
        // new MessagesPlaceholder("chat_history"),
        ["human", "{input}"],
    ]);

    const pchain = prompt.pipe(chain);

    const messageHistories: Record<string, InMemoryChatMessageHistory> = {};
    const withMessageHistory = new RunnableWithMessageHistory({
        runnable: pchain,
        getMessageHistory: async (sessionId) => {
        if (messageHistories[sessionId] === undefined) {
            messageHistories[sessionId] = new InMemoryChatMessageHistory();
        }
            return messageHistories[sessionId] as BaseChatMessageHistory | BaseListChatMessageHistory;
        },
        inputMessagesKey: "input",
        historyMessagesKey: "chat_history",
    });

    const config = {
        configurable: {
            sessionId: "test",
        },
    };
    
    const handleUserInput = async(input: string)=>{
        const stream = await withMessageHistory.stream(
            {
                input: input,
            },
            config
        );
        const result = []
        for await (const chunk of stream) {
            process.stdout.write(chunk as Buffer);
            // console.log((chunk as Buffer).toString())
            result.push(chunk)
        }
        
    }
    
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


// LangServe 側でプロンプトテンプレートを実装している場合
{
    // LangServe 側の例
    //
    //  prompt = ChatPromptTemplate.from_messages([
    //      SystemMessagePromptTemplate.from_template(
    //          "あなたはエージェント型チャットボットです。\n"
    //          "過去の会話を参照しながら対話者と会話することができます。\n"
    //          "発言は100字以内で短く返してください。\n\n"
    //      ),
    //      MessagesPlaceholder(variable_name="today_history"),
    //      HumanMessagePromptTemplate.from_template("{input}")
    //  ])
    //
    //  chain = prompt | llm
    //
    //  add_routes(
    //      app,
    //      chain, # chainを入れる
    //      path="/llama3"
    //  )
    
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
    
    // startChat();
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