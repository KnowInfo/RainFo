import { dispatchMessage } from "../bridge/browser";
import { ConsoleHandler, Logger } from "../bridge/logger";
import Message from "../bridge/message";

console.log('background is running')

chrome.runtime.onMessage.addListener((request) => {
  if (request.type === 'COUNT') {
    console.log('background has received a message from popup, and count is ', request?.count)
  }
})


const logger = new Logger('background', new ConsoleHandler());
const message = new Message(logger);

// 监听ping
message.addListener('highlite', (request, sender, sendResponse) => {
  sendResponse(request.data);
});

// 消息分发
dispatchMessage(message);
