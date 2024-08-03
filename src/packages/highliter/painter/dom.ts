import HighlightRange from "../model/range";
import { DomNode, SelectedNode, SplitType, SelectedNodeType } from "../types";
import { isHighlightWrapNode, addClass as addElementClass, removeAllClass } from "../util/dom";
import { DATASET_IDENTIFIER, DATASET_SPLIT_TYPE, DATASET_IDENTIFIER_EXTRA, getDefaultOptions, CAMEL_DATASET_IDENTIFIER, CAMEL_DATASET_IDENTIFIER_EXTRA, ID_DIVISION } from "../util/const";
export const hasClass = ($el: HTMLElement, className: string): boolean => {
  return $el.classList.contains(className)
}
/**
 * 支持的选择器类型
 *  - class: .title, .main-nav
 *  - id: #nav, #js-toggle-btn
 *  - tag: div, p, span
 */
const isMatchSelector = ($node: HTMLElement, selector: string): boolean => {
  if (!$node) {
    return false
  }
  if (/^\./.test(selector)) {
    const className = selector.replace(/^\./, '');
    return $node && hasClass($node, className)
  } else if (/^#/.test(selector)) {
    const id = selector.replace(/^#/, '');
    return $node && $node.id == id;
  }
  const tagName = selector.toUpperCase()
  return $node && $node.tagName == tagName;
};

const addClass = ($el: HTMLElement, className?: string[] | string | undefined): HTMLElement => {
  let classNames = Array.isArray(className) ? className : [className]
  classNames = classNames.length === 0 ? [getDefaultOptions().style.className] : classNames;
  classNames.forEach(c => {
    addElementClass($el, c);
  });
  return $el;
};

/**
 * Wrap a common wrapper.
 */
const wrapNewNode = (selected: SelectedNode, range: HighlightRange, className: string[] | string, wrapTag: string,): HTMLElement => {
  const $wrap = document.createElement(wrapTag);
  addClass($wrap, className);
  $wrap.appendChild(selected.$node.cloneNode(false));
  selected.$node.parentNode?.replaceChild($wrap, selected.$node);
  $wrap.setAttribute(`data-${DATASET_IDENTIFIER}`, range.id);
  $wrap.setAttribute(`data-${DATASET_SPLIT_TYPE}`, selected.splitType);
  $wrap.setAttribute(`data-${DATASET_IDENTIFIER_EXTRA}`, '');

  return $wrap;
}
/**
 * If start node and end node is the same, don't need to tranvers the dom tree.
 */
const getNodesIfSameStartEnd = ($startNode: Text, startOffset: number, endOffset: number, exceptSelectors?: string[] | null | undefined): SelectedNode[] => {
  let $element: Node | null = $startNode as Node;
  const isExcepted = ($e: HTMLElement) => exceptSelectors?.some(s => isMatchSelector($e, s));
  while ($element) {
    if ($element.nodeType === 1 && isExcepted($element as HTMLElement)) {
      return [];
    }
    $element = $element.parentNode;
  }
  $startNode.splitText(startOffset);
  const passedNode = $startNode.nextSibling as Text;
  passedNode.splitText(endOffset - startOffset);
  return [{
    $node: passedNode,
    type: SelectedNodeType.text,
    splitType: SplitType.both,
  }];
};

/**
 * get all the dom nodes between the start and end node
 */
export const getSelectedNodes = ($root: Document | HTMLElement, start: DomNode, end: DomNode, exceptSelectors: string[] | null | undefined,): SelectedNode[] | undefined => {
  const $startNode = start.$node;
  const $endNode = end.$node;
  const startOffset = start.offset;
  const endOffset = end.offset;

  if ($startNode == $endNode && $startNode instanceof Text) {
    return getNodesIfSameStartEnd($startNode, startOffset, endOffset, exceptSelectors);
  }

  const nodeStack: (ChildNode | Document | HTMLElement | Text)[] = [$root];
  const selectedNodes: SelectedNode[] = [];
  const isExcepted = ($e: HTMLElement) => exceptSelectors?.some(s => isMatchSelector($e, s));
  let withinSelectedRange = false;
  let curNode: Node | null = null;
  while ((curNode = nodeStack.pop() as Node)) {
    if (curNode.nodeType == 1 && isExcepted(curNode as HTMLElement)) {
      continue;
    }
    const children = curNode.childNodes;
    for (let i = children.length - 1; i >= 0; i--) {
      nodeStack.push(children[i]);
    }
    // only collect text nodes
    if (curNode == $startNode) {
      if (curNode.nodeType == 3) {
        (curNode as Text).splitText(startOffset);
        const node = curNode.nextSibling as Text;
        selectedNodes.push({
          $node: node,
          type: SelectedNodeType.text,
          splitType: SplitType.head,
        });
        // meet the start-node
        withinSelectedRange = true;
      }
    } else if (curNode == $endNode) {
      if (curNode.nodeType == 3) {
        const node = curNode as Text;
        node.splitText(endOffset);
        selectedNodes.push({
          $node: node,
          type: SelectedNodeType.text,
          splitType: SplitType.tail,
        });
      }
      // meet the end-node
      break;
    } else if (withinSelectedRange && curNode.nodeType === 3) {
      // handle text nodes between the range
      selectedNodes.push({
        $node: curNode as Text,
        type: SelectedNodeType.text,
        splitType: SplitType.none,
      });
    }
  };
  return selectedNodes;
};

export const unique = <T>(arr: T[]): T[] => {
  const res: T[] = [];

  for (const el of arr) {
    if (res.indexOf(el) === -1) {
      res.push(el);
    }
  }

  return res;
};

const isNodeEmpty = ($n: Node): boolean => !$n || !$n.textContent;

/**
 * Split and wrapper each one.
 */
const wrapPartialNode = (
  selected: SelectedNode,
  range: HighlightRange,
  className: string[] | string | undefined,
  wrapTag: string | undefined,
): HTMLElement => {
  const $wrap: HTMLElement = document.createElement(wrapTag || "");

  const $parent = selected.$node.parentNode as HTMLElement;
  const $prev = selected.$node.previousSibling;
  const $next = selected.$node.nextSibling;
  const $fr = document.createDocumentFragment();
  const parentId = $parent.dataset[CAMEL_DATASET_IDENTIFIER];
  const parentExtraId = $parent.dataset[CAMEL_DATASET_IDENTIFIER_EXTRA];
  const extraInfo = parentExtraId ? parentId + ID_DIVISION + parentExtraId : parentId;

  $wrap.setAttribute(`data-${DATASET_IDENTIFIER}`, range.id);
  $wrap.setAttribute(`data-${DATASET_IDENTIFIER_EXTRA}`, extraInfo || "");
  $wrap.appendChild(selected.$node.cloneNode(false));
  let headSplit = false;
  let tailSplit = false;
  let splitType: SplitType;

  if ($prev) {
    const $span = $parent.cloneNode(false);

    $span.textContent = $prev.textContent;
    $fr.appendChild($span);
    headSplit = true;
  }

  const classNameList: string[] = [];

  if (Array.isArray(className)) {
    classNameList.push(...className);
  } else {
    if (className)
      classNameList.push(className);
  }
  addClass($wrap, unique(classNameList));
  $fr.appendChild($wrap);

  if ($next) {
    const $span = $parent.cloneNode(false);

    $span.textContent = $next.textContent;
    $fr.appendChild($span);
    tailSplit = true;
  }

  if (headSplit && tailSplit) {
    splitType = SplitType.both;
  } else if (headSplit) {
    splitType = SplitType.head;
  } else if (tailSplit) {
    splitType = SplitType.tail;
  } else {
    splitType = SplitType.none;
  }

  $wrap.setAttribute(`data-${DATASET_SPLIT_TYPE}`, splitType);
  $parent?.parentNode?.replaceChild($fr, $parent);

  return $wrap;
};

/**
 * Just update id info (no wrapper updated).
 */
const wrapOverlapNode = (selected: SelectedNode, range: HighlightRange, className: string[] | string | undefined): HTMLElement => {
  const $parent = selected.$node.parentNode as HTMLElement;
  const $wrap: HTMLElement = $parent;

  removeAllClass($wrap);
  addClass($wrap, className);

  const dataset = $parent.dataset;
  const formerId = dataset[CAMEL_DATASET_IDENTIFIER];

  dataset[CAMEL_DATASET_IDENTIFIER] = range.id;
  dataset[CAMEL_DATASET_IDENTIFIER_EXTRA] = dataset[CAMEL_DATASET_IDENTIFIER_EXTRA]
    ? formerId + ID_DIVISION + dataset[CAMEL_DATASET_IDENTIFIER_EXTRA]
    : formerId;

  return $wrap;
};

/**
 * wrap a dom node with highlight wrapper
 *
 * Because of supporting the highlight-overlapping,
 * Highlighter can't just wrap all nodes in a simple way.
 * There are three types:
 *  - wrapping a whole new node (without any wrapper)
 *  - wrapping part of the node
 *  - wrapping the whole wrapped node
 */
export const wrapHighlight = (selected: SelectedNode, range: HighlightRange, className: string[] | string, wrapTag: string): HTMLElement => {
  const $parent = selected.$node.parentNode as HTMLHtmlElement
  const $prev = selected.$node.previousSibling;
  const $next = selected.$node.nextSibling;
  let $wrap: HTMLElement;

  // text node, not in a highlight wrapper -> should be wrapped in a highlight wrapper
  if (!isHighlightWrapNode($parent)) {
    $wrap = wrapNewNode(selected, range, className, wrapTag);
  }
  // text node, in a highlight wrap -> should split the existing highlight wrapper
  else if (isHighlightWrapNode($parent as HTMLElement) && (!isNodeEmpty($prev as Node) || !isNodeEmpty($next as Node))) {
    $wrap = wrapPartialNode(selected, range, className, wrapTag);
  }
  // completely overlap (with a highlight wrap) -> only add extra id info
  else {
    $wrap = wrapOverlapNode(selected, range, className);
  }

  return $wrap;
}

/**
 * merge the adjacent text nodes
 * .normalize() API has some bugs in IE11
 */
export const normalizeSiblingText = ($s: Node, isNext = true) => {
  if (!$s || $s.nodeType !== 3) {
    return;
  }

  const $sibling = isNext ? $s.nextSibling : $s.previousSibling;

  if (!$sibling || $sibling.nodeType !== 3) {
    return;
  }

  const text = $sibling.nodeValue;

  $s.nodeValue = isNext ? $s.nodeValue ? $s.nodeValue : "" + text : text ? text : "" + $s.nodeValue;
  $sibling.parentNode?.removeChild($sibling);
};
