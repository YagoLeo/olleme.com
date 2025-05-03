import { CoreMessage, generateId, Message } from "ai";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface ChatSession {
  messages: Message[];
  createdAt: string;
}

// 添加服务器模型映射接口
interface ServerModels {
  [url: string]: string[];
}

interface State {
  base64Images: string[] | null;
  chats: Record<string, ChatSession>;
  currentChatId: string | null;
  selectedModel: string | null;
  userName: string | "Anonymous";
  isDownloading: boolean;
  downloadProgress: number;
  downloadingModel: string | null;
  ollamaUrlArr: string[];
  ollamaUrl: string;
  serverModelsMap: ServerModels; // 新增服务器模型映射状态
}

interface Actions {
  setBase64Images: (base64Images: string[] | null) => void;
  setCurrentChatId: (chatId: string) => void;
  setSelectedModel: (selectedModel: string) => void;
  getChatById: (chatId: string) => ChatSession | undefined;
  getMessagesById: (chatId: string) => Message[];
  saveMessages: (chatId: string, messages: Message[]) => void;
  handleDelete: (chatId: string, messageId?: string) => void;
  setUserName: (userName: string) => void;
  startDownload: (modelName: string) => void;
  stopDownload: () => void;
  setDownloadProgress: (progress: number) => void;
  setOllamaUrl: (url: string) => void;
  addOllamaUrl: (url: string) => void;
  setServerModels: (url: string, models: string[]) => void; // 新增设置服务器模型的方法
  getServerModels: (url: string) => string[]; // 新增获取服务器模型的方法
}

const useChatStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      base64Images: null,
      chats: {},
      currentChatId: null,
      selectedModel: null,
      userName: "Anonymous",
      isDownloading: false,
      downloadProgress: 0,
      downloadingModel: null, 
      ollamaUrlArr: [
        "http://59.110.239.236:11434",
        "http://203.176.92.112:11434",
        'http://43.136.23.105:11434',
        'http://103.35.79.158:11434',
        'http://182.150.117.139:11434',
        'http://222.128.0.41:11434',
        'http://36.103.168.52:11434',
        'http://1.34.160.207:11434',
        'http://121.41.92.19:11434',
        'http://220.168.146.21:60001'
      ],

      ollamaUrl: "http://59.110.239.236:11434",
      serverModelsMap: {}, // 初始化服务器模型映射为空对象

      setBase64Images: (base64Images) => set({ base64Images }),
      setUserName: (userName) => set({ userName }),

      setCurrentChatId: (chatId) => set({ currentChatId: chatId }),
      setSelectedModel: (selectedModel) => set({ selectedModel }),
      getChatById: (chatId) => {
        const state = get();
        return state.chats[chatId];
      },
      getMessagesById: (chatId) => {
        const state = get();
        return state.chats[chatId]?.messages || [];
      },
      saveMessages: (chatId, messages) => {
        set((state) => {
          const existingChat = state.chats[chatId];

          return {
            chats: {
              ...state.chats,
              [chatId]: {
                messages: [...messages],
                createdAt: existingChat?.createdAt || new Date().toISOString(),
              },
            },
          };
        });
      },
      handleDelete: (chatId, messageId) => {
        set((state) => {
          const chat = state.chats[chatId];
          if (!chat) return state;

          // If messageId is provided, delete specific message
          if (messageId) {
            const updatedMessages = chat.messages.filter(
              (message) => message.id !== messageId
            );
            return {
              chats: {
                ...state.chats,
                [chatId]: {
                  ...chat,
                  messages: updatedMessages,
                },
              },
            };
          }

          // If no messageId, delete the entire chat
          const { [chatId]: _, ...remainingChats } = state.chats;
          return {
            chats: remainingChats,
          };
        });
      },

      startDownload: (modelName) =>
        set({ isDownloading: true, downloadingModel: modelName, downloadProgress: 0 }),
      stopDownload: () =>
        set({ isDownloading: false, downloadingModel: null, downloadProgress: 0 }),
      setDownloadProgress: (progress) => set({ downloadProgress: progress }),
      
      setOllamaUrl: (url) => set({ ollamaUrl: url }),
      addOllamaUrl: (url) => set((state) => {
        if (state.ollamaUrlArr.includes(url)) return state;
        return { ollamaUrlArr: [...state.ollamaUrlArr, url] };
      }),
      
      // 新增设置服务器模型的方法
      setServerModels: (url, models) => set((state) => ({
        serverModelsMap: {
          ...state.serverModelsMap,
          [url]: models
        }
      })),
      
      // 新增获取服务器模型的方法
      getServerModels: (url) => {
        const state = get();
        return state.serverModelsMap[url] || [];
      }
    }),
    {
      name: "nextjs-ollama-ui-state",
      partialize: (state) => ({
        chats: state.chats,
        currentChatId: state.currentChatId,
        selectedModel: state.selectedModel,
        userName: state.userName,
        ollamaUrlArr: state.ollamaUrlArr,
        ollamaUrl: state.ollamaUrl,
        serverModelsMap: state.serverModelsMap,
      }),
      migrate: (persistedState: any, version) => {
        const defaultUrls = ["http://59.110.239.236:11434", "http://203.176.92.112:11434"];
        
        if (persistedState.ollamaUrlArr) {
          let updatedUrls = persistedState.ollamaUrlArr.filter(
            (url: string) => !url.includes("127.0.0.1")
          );
          
          defaultUrls.forEach(url => {
            if (!updatedUrls.includes(url)) {
              updatedUrls.push(url);
            }
          });
          
          persistedState.ollamaUrlArr = updatedUrls;
          
          if (persistedState.ollamaUrl && persistedState.ollamaUrl.includes("127.0.0.1")) {
            persistedState.ollamaUrl = defaultUrls[0];
          }
          
          persistedState.serverModelsMap = {};
        }
        
        return persistedState as State;
      },
    }
  )
);

if (typeof window !== 'undefined') {
  setTimeout(() => {
    const state = useChatStore.getState();
    if (state.ollamaUrlArr.some(url => url.includes("127.0.0.1"))) {
      const defaultUrls = ["http://59.110.239.236:11434", "http://203.176.92.112:11434"];
      const updatedUrls = state.ollamaUrlArr.filter(url => !url.includes("127.0.0.1"));
      
      defaultUrls.forEach(url => {
        if (!updatedUrls.includes(url)) {
          updatedUrls.push(url);
        }
      });
      
      useChatStore.setState({ 
        ollamaUrlArr: updatedUrls,
        ollamaUrl: state.ollamaUrl.includes("127.0.0.1") ? defaultUrls[0] : state.ollamaUrl,
        serverModelsMap: {}
      });
    }
  }, 0);
}

export default useChatStore;