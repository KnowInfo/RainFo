// 这里实现功能业务逻辑
import APP from './app';
import Highlighter from "../../packages/highliter";
import HighlightRange from "../../packages/highliter/model/range";
import type HighlightSource from "../../packages/highliter/model/source";
import React from 'react';
import ReactDOM from 'react-dom';
import StrikethroughOverlay from './modal';
import { createRoot } from 'react-dom/client';
import "./modal.css"
import { Logger } from '../../bridge/logger';
import Message from '../../bridge/message';

export default class AiReadHighLight {
  highlighter: Highlighter;
  logger: Logger
  message: Message
  constructor() {
    this.logger = Logger.createLogger('Highlight', "console", {});  // 日志记录器，用来记录所有操作的日志
    this.highlighter = new Highlighter()
    this.message = new Message(this.logger)  // 信息发送到后台
    this.addModelEventListenal() // 增加模态框内部的相关业务逻辑，主要是一些节点的事件监听
    this.highlighter.on(Highlighter.event.SELECTE, ({ range }) => this._handlerNoteSelected(range)); // 当文字被选择时触发
    this.highlighter.on(Highlighter.event.CREATE, ({ sources }) => this._handlerNoteCreate(sources));  // 当文字被高亮后触发
    this.highlighter.on(Highlighter.event.HOVER, ({ id }) => this._handlerNoteMouseIn(id))  // 当高亮笔记被鼠标滑入的时候触发
    this.highlighter.on(Highlighter.event.HOVER_OUT, ({ id }) => this._handlerNoteMouseOut(id)) // 当高亮笔记被鼠标滑出时触发
    this.highlighter.on(Highlighter.event.CLICK, ({ id }) => this._handlerNoteMouseClick(id)) // 当高亮笔记被鼠标点击时触发
    this.highlighter.on(Highlighter.event.REMOVE, ({ ids }) => this._handlerNoteRemoved(ids)) // 当高亮笔记被移除时触发
    this.highlighter.run()
  };

  // 增加模态框相关节点
  private readonly addModel = () => {
    const ExistTarget = document.getElementById("aiReadWrap")
    // biome-ignore lint/suspicious/noImplicitAnyLet: <explanation>
    let root;
    // 如果不存在根节点，则创建
    if (!ExistTarget) {
      const ExistTarget = document.createElement('div');
      ExistTarget.id = "aiReadWrap"
      document.body.appendChild(ExistTarget);
      root = createRoot(ExistTarget);
    } else {

      root = createRoot(ExistTarget)
    }
    root.render(
      <StrikethroughOverlay
        text={"划线部分"}
        onConfirm={() => {
          // 这里添加确认后的逻辑
          const container = document.getElementById("aiReadWrap")
          console.log(container)
          document.body.removeChild(container); // 移除 DOM 元素，React 会自动卸载组件
        }}
        onCancel={() => {
          // 这里添加取消后的逻辑
          const container = document.getElementById("aiReadWrap")
          document.body.removeChild(container); // 移除 DOM 元素，React 会自动卸载组件
        }}
      />
    );
  };

  // 增加模态框内部的一些业务逻辑的事件监听
  private readonly addModelEventListenal = () => {

  };

  // 当元素被选择时触发
  private readonly _handlerNoteSelected = (range: HighlightRange) => {
    if (this.highlighter.options.style?.className) {
      console.log("笔记被选择", range)
      this.highlighter.fromRange(range, this.highlighter.options.style.className);  // 执行此函数，即可进行高亮
      HighlightRange.removeDomRange(); // 移除默认的划词选择特效
    }
  };

  // 当元素被高亮时触发
  private readonly _handlerNoteCreate = (sources: HighlightSource[]) => {
    console.log("笔记已被高亮", sources)
    this.message.sendMessage("highlite", sources).then(res => {
      this.logger.info(res)
    })
    // this.addModel() // 增加模态框或嵌入页面等相关的 html 节点
  };

  // 当鼠标划入高亮元素时触发
  private readonly _handlerNoteMouseIn = (id: string) => {
    this.highlighter.addClassclassnameid("active", id)

  };

  // 当鼠标划出高亮元素时触发
  private readonly _handlerNoteMouseOut = (id: string) => {
    this.highlighter.removeClassclassnameid("active", id)
  };

  // 当鼠标点击高亮元素时触发， 移除高亮效果
  private readonly _handlerNoteMouseClick = (id: string) => {
    this.highlighter.remove(id)
  };

  // 当高亮元素被移除时触发
  private readonly _handlerNoteRemoved = (ids: string[]) => {
    console.log("高亮被移出", ids)
  };
}
