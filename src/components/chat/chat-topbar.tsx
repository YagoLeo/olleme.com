"use client";

import React, { useEffect, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "../ui/button";
import { CaretSortIcon, HamburgerMenuIcon, MagnifyingGlassIcon, ShuffleIcon } from "@radix-ui/react-icons";
import { Sidebar } from "../sidebar";
import { Message } from "ai/react";
import { getSelectedModel } from "@/lib/model-helper";
import useChatStore from "@/app/hooks/useChatStore";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { toast } from "sonner";

interface ChatTopbarProps {
  isLoading: boolean;
  chatId?: string;
  messages: Message[];
  setMessages: (messages: Message[]) => void;
}

// 存储所有模型及其所在服务器的映射
interface AllModelsMap {
  [modelName: string]: string[];  // 模型名称 -> 包含该模型的服务器URL数组
}

export default function ChatTopbar({
  isLoading,
  chatId,
  messages,
  setMessages,
}: ChatTopbarProps) {
  const [models, setModels] = React.useState<string[]>([]);
  const [modelOpen, setModelOpen] = React.useState(false);
  const [urlOpen, setUrlOpen] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [customUrlDialogOpen, setCustomUrlDialogOpen] = useState(false);
  const [customUrl, setCustomUrl] = useState("");
  const [urlSearchQuery, setUrlSearchQuery] = useState("");
  const [modelSearchQuery, setModelSearchQuery] = useState("");
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [allModelsMap, setAllModelsMap] = useState<AllModelsMap>({});
  
  const selectedModel = useChatStore((state) => state.selectedModel);
  const setSelectedModel = useChatStore((state) => state.setSelectedModel);
  const ollamaUrlArr = useChatStore((state) => state.ollamaUrlArr);
  const ollamaUrl = useChatStore((state) => state.ollamaUrl);
  const setOllamaUrl = useChatStore((state) => state.setOllamaUrl);
  const addOllamaUrl = useChatStore((state) => state.addOllamaUrl);
  const setServerModels = useChatStore((state) => state.setServerModels);
  const getServerModels = useChatStore((state) => state.getServerModels);
  const serverModelsMap = useChatStore((state) => state.serverModelsMap);

  // 过滤URL和模型的函数
  const filteredUrls = ollamaUrlArr.filter(url => {
    // 如果已选择模型，只显示拥有此模型的服务器
    const showOnlyCompatible = selectedModel && allModelsMap[selectedModel];
    if (showOnlyCompatible) {
      return allModelsMap[selectedModel].includes(url) && 
             url.toLowerCase().includes(urlSearchQuery.toLowerCase());
    }
    // 否则显示所有匹配搜索的服务器
    return url.toLowerCase().includes(urlSearchQuery.toLowerCase());
  });
  
  // 获取所有可用的模型（跨所有服务器）
  const allModels = Object.keys(allModelsMap);
  
  // 根据搜索筛选模型
  const filteredModels = allModels.filter(model => 
    model.toLowerCase().includes(modelSearchQuery.toLowerCase())
  );

  // 从单个服务器加载模型
  const loadModelsFromServer = async (url: string) => {
    try {
      const res = await fetch(`/api/tags?ollamaUrl=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);

      const data = await res.json().catch(() => null);
      if (!data?.models?.length) return [];

      const serverModels = data.models.map(({ name }: { name: string }) => name);
      setServerModels(url, serverModels);
      return serverModels;
    } catch (error) {
      console.error(`Error fetching models from ${url}:`, error);
      return [];
    }
  };

  // 加载当前服务器的模型
  useEffect(() => {
    (async () => {
      try {
        const serverModels = getServerModels(ollamaUrl);
        if (serverModels.length > 0) {
          // 如果已经有缓存的模型数据，直接使用
          setModels(serverModels);
        } else {
          // 否则从服务器获取
          const newModels = await loadModelsFromServer(ollamaUrl);
          setModels(newModels);
        }
      } catch (error) {
        console.error("Error fetching models:", error);
      }
    })();
  }, [ollamaUrl]);

  // 预加载所有服务器的模型
  useEffect(() => {
    const loadAllServers = async () => {
      setIsLoadingModels(true);
      const newAllModelsMap: AllModelsMap = {};
      
      // 串行加载以减少服务器压力
      for (const url of ollamaUrlArr) {
        // 检查是否已有缓存
        let serverModels = getServerModels(url);
        
        // 如果没有缓存，则加载
        if (serverModels.length === 0) {
          serverModels = await loadModelsFromServer(url);
        }
        
        // 更新模型映射
        serverModels.forEach(model => {
          if (!newAllModelsMap[model]) {
            newAllModelsMap[model] = [];
          }
          newAllModelsMap[model].push(url);
        });
      }
      
      setAllModelsMap(newAllModelsMap);
      setIsLoadingModels(false);
    };
    
    loadAllServers();
  }, [ollamaUrlArr]);

  const handleModelChange = (model: string) => {
    // 找到拥有这个模型的服务器
    const serversWithModel = allModelsMap[model] || [];
    
    // 如果当前服务器有这个模型，就不需要切换
    if (serversWithModel.includes(ollamaUrl)) {
      setSelectedModel(model);
    } 
    // 否则，自动切换到第一个拥有该模型的服务器
    else if (serversWithModel.length > 0) {
      const newServer = serversWithModel[0];
      setOllamaUrl(newServer);
      setSelectedModel(model);
      toast.info(`已自动切换到服务器 ${new URL(newServer).hostname}`);
    } else {
      toast.error("没有服务器拥有此模型");
    }
    
    setModelOpen(false);
  };

  const handleUrlChange = (url: string) => {
    setOllamaUrl(url);
    setUrlOpen(false);
  };

  const handleAddCustomUrl = () => {
    if (customUrl && customUrl.trim() !== "") {
      addOllamaUrl(customUrl.trim());
      setOllamaUrl(customUrl.trim());
      setCustomUrl("");
      setCustomUrlDialogOpen(false);
      setUrlOpen(false);
    }
  };

  const handleRandomUrl = () => {
    if (ollamaUrlArr.length > 0) {
      const randomIndex = Math.floor(Math.random() * ollamaUrlArr.length);
      setOllamaUrl(ollamaUrlArr[randomIndex]);
      setUrlOpen(false);
    }
  };

  const handleCloseSidebar = () => {
    setSheetOpen(false);
  };

  return (
    <div className="w-full flex px-4 py-6 items-center justify-between lg:justify-center gap-2">
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger>
          <HamburgerMenuIcon className="lg:hidden w-5 h-5" />
        </SheetTrigger>
        <SheetContent side="left">
          <Sidebar
            chatId={chatId || ""}
            isCollapsed={false}
            isMobile={false}
            messages={messages}
            closeSidebar={handleCloseSidebar}
          />
        </SheetContent>
      </Sheet>

      {/* All Models Selector */}
      <div className="flex flex-col items-center">
        <label className="text-xs text-muted-foreground mb-1">选择模型</label>
        <Popover open={modelOpen} onOpenChange={setModelOpen}>
          <PopoverTrigger asChild>
            <Button
              disabled={isLoading}
              variant="outline"
              role="combobox"
              aria-expanded={modelOpen}
              className="w-[200px] justify-between"
            >
              {selectedModel || "选择模型"}
              <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[320px] p-2">
            <div className="flex items-center gap-1 p-1 mb-2">
              <Input
                placeholder="搜索模型..."
                value={modelSearchQuery}
                onChange={e => setModelSearchQuery(e.target.value)}
                className="flex-1"
              />
            </div>
            <div className="max-h-[350px] overflow-y-auto pr-1">
              {isLoadingModels ? (
                <div className="flex items-center justify-center p-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  <span className="ml-2 text-sm">正在加载模型...</span>
                </div>
              ) : filteredModels.length > 0 ? (
                [...filteredModels].sort().map((model) => {
                  // 找出拥有此模型的服务器
                  const servers = allModelsMap[model] || [];
                  const currentServerHasModel = servers.includes(ollamaUrl);
                  
                  return (
                    <div key={model} className="mb-2 border rounded-md overflow-hidden">
                      <Button
                        variant={currentServerHasModel ? "default" : "ghost"}
                        className="w-full text-left rounded-t-md rounded-b-none justify-between group"
                        onClick={() => handleModelChange(model)}
                      >
                        <span className="font-medium truncate">{model}</span>
                        {currentServerHasModel && (
                          <span className="bg-green-500 rounded-full w-2 h-2 ml-2"></span>
                        )}
                      </Button>
                      <div className="bg-muted/30 px-3 py-1 text-xs flex justify-between items-center">
                        <span className="text-muted-foreground">
                          {servers.length} 个服务器可用
                        </span>
                        {currentServerHasModel ? (
                          <span className="text-green-600 font-medium">当前服务器可用</span>
                        ) : (
                          <span className="text-yellow-600">将自动切换服务器</span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    没有找到匹配的模型
                  </p>
                  <p className="text-xs text-muted-foreground">
                    请尝试其他搜索词或确认服务器连接
                  </p>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Ollama URL Selector */}
      <div className="flex flex-col items-center">
        <label className="text-xs text-muted-foreground mb-1">
          {selectedModel ? `${selectedModel} 可用服务器` : "选择服务器"}
        </label>
        <Popover open={urlOpen} onOpenChange={setUrlOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={urlOpen}
              className="justify-between w-[200px]"
            >
              {ollamaUrl ? new URL(ollamaUrl).hostname : "选择服务器"}
              <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[320px] p-2">
            <div className="flex items-center gap-2 p-1 mb-2">
              <Input
                placeholder="搜索服务器..."
                value={urlSearchQuery}
                onChange={e => setUrlSearchQuery(e.target.value)}
                className="flex-1"
              />
              {selectedModel && (
                <div className="text-xs bg-primary/10 text-primary rounded-md px-2 py-1">
                  {allModelsMap[selectedModel]?.length || 0} 个兼容服务器
                </div>
              )}
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleRandomUrl}
                title="随机选择服务器"
                className="shrink-0"
              >
                <ShuffleIcon className="h-4 w-4" />
              </Button>
            </div>
            <div className="max-h-[250px] overflow-y-auto pr-1">
              {filteredUrls.length > 0 ? (
                filteredUrls.map((url) => (
                  <Button
                    key={url}
                    variant={url === ollamaUrl ? "default" : "ghost"}
                    className="w-full justify-start text-left my-1 truncate"
                    onClick={() => handleUrlChange(url)}
                  >
                    <span className={url === ollamaUrl ? "font-medium" : ""}>
                      {url}
                    </span>
                  </Button>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    {selectedModel 
                      ? `没有找到兼容 ${selectedModel} 的服务器` 
                      : "没有找到匹配的服务器"
                    }
                  </p>
                </div>
              )}
            </div>
            <div className="mt-3 pt-2 border-t">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setCustomUrlDialogOpen(true)}
              >
                添加自定义服务器
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Custom URL Dialog */}
      <Dialog open={customUrlDialogOpen} onOpenChange={setCustomUrlDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>添加自定义Ollama URL</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="custom-url" className="text-right">
                URL
              </Label>
              <Input
                id="custom-url"
                placeholder="http://example.com:11434"
                className="col-span-3"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddCustomUrl}>添加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
