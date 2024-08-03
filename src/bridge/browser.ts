export const openOptionsPage = (): void => {
  chrome.runtime.openOptionsPage();
};

export const getURL = (resource: string): string => {
  return chrome.runtime.getURL(resource);
};

export const sendMessage = async (message: any): Promise<any> => {
  return chrome.runtime.sendMessage(message);
};

export const queryTabs = async (query?: object): Promise<chrome.tabs.Tab[]> => {
  if (typeof chrome === 'undefined' || !chrome.tabs) {
    return [];
  }

  return chrome.tabs.query(query || {});
};

export const sendMessageToTab = async (tabID: number, message: any): Promise<any> => {
  return chrome.tabs.sendMessage(tabID, message);
};

export const sendMessageToTabs = async (query: object, message: any): Promise<any[]> => {
  const tabs = await queryTabs(query);
  return Promise.all(tabs.map(tab => sendMessageToTab(tab.id, message)));
};

// Assuming `message` is an object with a `dispatch` method that has the following signature:
// dispatch: (req: any, sender: string, sendResponse: (response: any) => void) => void
export const dispatchMessage = (message: { dispatch: (req: any, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => void }): void => {
  chrome.runtime.onMessage.addListener(
    (req: any, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
      message.dispatch(req, sender, sendResponse);
    }
  );
};
