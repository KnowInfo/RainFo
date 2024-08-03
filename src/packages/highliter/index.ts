import HighlightRange from "./model/range";
import HighlightSource from "./model/source";
import Painter from "./painter";
import { CreateFrom, type DomMeta, ERROR, EventType, type HighlighterOptions, type HookMap } from "./types";
import { CAMEL_DATASET_IDENTIFIER, DEFAULT_WRAP_TAG, eventEmitter, getDefaultOptions, INTERNAL_ERROR_EVENT } from "./util/const";
import { addClass, addElEventListener, getExtraHighlightId, getHighlightById, getHighlightId, getHighlightsByRoot, isHighlightWrapNode, removeClass, removeElEventListener } from "./util/dom";
import EventEmitter from "./util/event.emitter";
import Hook from "./util/hook";
import getInteraction from "./util/interaction";
import HighLightCache from "./data/cache"
interface EventHandlerMap {
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  [key: string]: (...args: any[]) => void;
  [EventType.CLICK]: (data: { id: string }, h: Highlighter, e: MouseEvent | TouchEvent) => void;
  [EventType.HOVER]: (data: { id: string }, h: Highlighter, e: MouseEvent | TouchEvent) => void;
  [EventType.HOVER_OUT]: (data: { id: string }, h: Highlighter, e: MouseEvent | TouchEvent) => void;
  [EventType.CREATE]: (data: { sources: HighlightSource[]; type: CreateFrom }, h: Highlighter) => void;
  [EventType.REMOVE]: (data: { ids: string[] }, h: Highlighter) => void;
}

export default class Highlighter extends EventEmitter<EventHandlerMap> {
  static event = EventType;
  static isHighlightWrapNode = isHighlightWrapNode;
  hooks: HookMap;
  painter: Painter;
  cache: HighLightCache;
  private _hoverId: string | null;
  options: HighlighterOptions;
  private readonly event = getInteraction();
  constructor(options?: HighlighterOptions) {
    super();
    this.options = getDefaultOptions();
    this._hoverId = null;
    // initialize hooks
    this.hooks = this._getHooks()
    this.setOption(options);
    // initialize cache
    this.cache = new HighLightCache();

    this.painter = new Painter({
      $root: this.options.$root,
      wrapTag: this.options.wrapTag,
      className: this.options.style?.className,
      exceptSelectors: this.options.exceptSelectors,
    }, this.hooks);
    const $root = this.options.$root;
    // initialize event listener
    addElEventListener($root, this.event.PointerOver, this._handleHighlightHover);
    addElEventListener($root, this.event.PointerTap, this._handleHighlightClick);
    eventEmitter.on(INTERNAL_ERROR_EVENT, this._handleError);
  }

  // 初始化时，传入 option 参数
  setOption = (options?: HighlighterOptions) => {
    this.options = {
      ...this.options,
      ...options,
    };
  };

  // 判定 source 是否为高亮
  static isHighlightSource = (d: HighlightSource) => !!d.__isHighlightSource;

  // 程序运行时
  run = () => addElEventListener(this.options.$root, this.event.PointerEnd, this._handleSelection);

  // 程序停止
  stop = () => {
    removeElEventListener(this.options.$root, this.event.PointerEnd, this._handleSelection);
  };

  // 程序销毁
  dispose = () => {
    removeElEventListener(this.options.$root, this.event.PointerOver, this._handleHighlightHover);
    removeElEventListener(this.options.$root, this.event.PointerEnd, this._handleSelection);
    removeElEventListener(this.options.$root, this.event.PointerTap, this._handleHighlightClick);
    this.removeAll();
  };

  // 给高亮元素添加 class 如果不传 id 则默认为全部高亮添加 class
  addClassclassnameid = (className: string, id?: string) => {
    // biome-ignore lint/complexity/noForEach: <explanation>
    this.getDoms(id).forEach($n => {
      addClass($n, className);
    })
  };

  // 给高亮元素移除 class 如果不传 id 则默认为全部高亮元素移除 class
  removeClassclassnameid = (className: string, id?: string) => {
    // biome-ignore lint/complexity/noForEach: <explanation>
    this.getDoms(id).forEach($n => {
      removeClass($n, className);
    })
  };

  getIdByDom = ($node: HTMLElement): string => getHighlightId($node, this.options.$root);

  getExtraIdByDom = ($node: HTMLElement): string[] => getExtraHighlightId($node, this.options.$root);

  // 通过高亮 id 获取 dom 元素
  getDoms = (id?: string): HTMLElement[] => {
    return id ? getHighlightById(this.options.$root, id, this.options.wrapTag) : getHighlightsByRoot(this.options.$root, this.options.wrapTag)
  };

  // 用于从服务器或本地存储中恢复数据
  fromStore = (start: DomMeta, end: DomMeta, text: string, id: string, className: string[] | string, extra?: unknown): HighlightSource | null => {
    const hs = new HighlightSource(start, end, text, id, className, extra);

    try {
      this._highlightFromHSource(hs);
      return hs;
    } catch (err: unknown) {
      eventEmitter.emit(INTERNAL_ERROR_EVENT, {
        type: ERROR.HIGHLIGHT_SOURCE_RECREATE,
        error: err,
        detail: hs,
      });

      return null;
    }
  };

  // 暴露给业务调用，从本地输入选择
  fromRange = (range: HighlightRange, className: string[] | string) => {
    // 这里需要加入模态选择的逻辑
    if (className) {
      this._highlightFromHRange(range, className);
    }
  };

  // 通过 id 移除高亮元素
  remove(id: string) {
    if (!id) {
      return;
    }
    console.log(id)
    const doseExist = this.painter.removeHighlight(id);
    console.log(doseExist)
    this.cache.remove(id);
    if (doseExist) {
      this.emit(EventType.REMOVE, { ids: [id] }, this);
    }
  };

  // 移除所有高亮元素
  removeAll() {
    this.painter.removeAllHighlight();
    const ids = this.cache.removeAll()
    this.emit(EventType.REMOVE, { ids: ids }, this);
  };

  // 获取钩子（预留功能）
  private readonly _getHooks = (): HookMap => ({
    Render: {
      UUID: new Hook('Render.UUID'),
      SelectedNodes: new Hook('Render.SelectedNodes'),
      WrapNode: new Hook('Render.WrapNode'),
    },
    Serialize: {
      Restore: new Hook('Serialize.Restore'),
      RecordInfo: new Hook('Serialize.RecordInfo'),
    },
    Remove: {
      UpdateNodes: new Hook('Remove.UpdateNodes'),
    },
  });

  // 从 range 进行高亮
  private readonly _highlightFromHRange = (range: HighlightRange, className: string[] | string): HighlightSource | null => {
    const source: HighlightSource = range.serialize(this.options.$root, this.hooks, className);
    const $wraps = this.painter.highlightRange(range, className);
    if ($wraps?.length === 0) {
      eventEmitter.emit(INTERNAL_ERROR_EVENT, {
        type: ERROR.DOM_SELECTION_EMPTY,
      });
      return null;
    }
    this.cache.save(source);
    this.emit(EventType.CREATE, { sources: [source], type: CreateFrom.INPUT }, this);
    return source;
  };

  // 从 source 进行高亮
  private _highlightFromHSource(sources: HighlightSource | HighlightSource[] = []) {
    const renderedSources: HighlightSource[] = this.painter.highlightSource(sources);
    this.emit(EventType.CREATE, { sources: renderedSources, type: CreateFrom.STORE }, this);
    this.cache.save(sources);
  };

  // 处理 selection 事件
  private readonly _handleSelection = () => {
    const range = HighlightRange.fromSelection();
    if (range) {
      this.emit(EventType.SELECTE, { range: range, type: CreateFrom.INPUT }, this);
    }
  };

  // 处理 mouseover 事件，如果鼠标移出和移入高亮元素，触发事件
  private readonly _handleHighlightHover = (evt: Event) => {
    if (evt instanceof MouseEvent || evt instanceof TouchEvent) {
      // 处理 MouseEvent
      const $target = evt.target as HTMLElement;
      if (!isHighlightWrapNode($target)) {
        if (this._hoverId) {
          console.log("移出高亮", this._hoverId);
          this.emit(EventType.HOVER_OUT, {
            id: this._hoverId
          }, this, evt);
        }
        this._hoverId = null;
        return;
      }
      const id = getHighlightId($target, this.options.$root);
      // prevent trigger in the same highlight range
      if (this._hoverId === id) {
        return;
      }
      // hover another hightlight range, need to trigger previous highlight hover out event
      if (this._hoverId) {
        this.emit(EventType.HOVER_OUT, { id: this._hoverId }, this, evt);
      }
      this._hoverId = id;
      this.emit(EventType.HOVER, { id: this._hoverId }, this, evt);
      console.log("进入高亮", this._hoverId);
    };
    return;
  };

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  private readonly _handleError = (type: { type: ERROR; detail?: HighlightSource; error?: any }) => {
    if (this.options.verbose) {
      // eslint-disable-next-line no-console
      console.warn(type);
    }
  };

  // 处理点击高亮元素事件
  private readonly _handleHighlightClick = (evt: Event) => {
    if (evt instanceof MouseEvent || evt instanceof TouchEvent) {
      const $target = evt.target as HTMLElement;
      if (isHighlightWrapNode($target)) {
        const id = getHighlightId($target, this.options.$root)
        this.emit(EventType.CLICK, { id }, this, evt)
      }
    }
    return;
  };
}
