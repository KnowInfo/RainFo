import { sendMessageToTabs, sendMessage } from "./browser"; // 注意文件名应为 "browser" 而不是 "brower"

export default class Message {
  private listeners: { [subject: string]: Array<(request: { subject: string, data: any }, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => void> } = {};
  private logger: { info: (message: string) => void };

  constructor(logger: { info: (message: string) => void }) {
    this.listeners = {};
    this.logger = logger;
  }

  /**
   * 发送消息到后台
   * @param subject 消息主题
   * @param data 消息数据
   * @return {Promise<unknown>}
   */
  async sendMessage(subject: string, data?: any): Promise<unknown> {
    this.logger.info(`send message ${subject}, ${JSON.stringify(data)}`); // 后面需要删除，前期调试使用
    return sendMessage({ subject, data });
  }

  /**
   * 发送消息到查询到的tabs
   * @param query 查询条件对象
   * @param subject 消息主题
   * @param data 消息数据
   * @return {Promise<unknown[]>}
   */
  async sendMessageToTabs(query: object, subject: string, data: any): Promise<unknown[]> {
    return sendMessageToTabs(query, { subject, data });
  }

  /**
   * 添加消息监听
   * @param subject 消息主题
   * @param listener 消息监听函数
   * @return {Message}
   */
  addListener(subject: string, listener: (request: { subject: string, data: any }, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => void): Message {
    if (!this.listeners[subject]) {
      this.listeners[subject] = [];
    }

    this.listeners[subject].push(listener);
    return this;
  }

  /**
   * 删除监听者
   * @param subject 消息主题
   * @param listener 要删除的监听函数
   * @return {boolean} 如果成功删除返回 true，否则返回 false
   */
  removeListener(subject: string, listener: (request: { subject: string, data: any }, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => void): boolean {
    if (!this.listeners[subject]) {
      return false;
    }

    const listenerPos = this.listeners[subject].indexOf(listener);
    if (listenerPos === -1) {
      return false;
    }

    this.listeners[subject].splice(listenerPos, 1);
    return true;
  }

  /**
   * 分发消息给对应 subject 的监听者
   * @param request 包含 subject 和 data 的请求对象
   * @param sender 发送者标识
   * @param sendResponse 响应发送函数
   * @return {Promise<boolean>}
   */
  dispatch(request: { subject: string, data: any }, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void): Promise<boolean> {
    const { subject } = request;
    const listeners = this.listeners[subject];
    if (!listeners || listeners.length === 0) {
      sendResponse(null);
      return Promise.resolve(false);
    }

    this.logger.info(`dispatch ${subject} to ${listeners.length} listeners`);
    for (const handler of listeners) {
      handler(request, sender, sendResponse);
    }

    return Promise.resolve(true);
  }
}
