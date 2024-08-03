import HighlightSource from ".";
import { DomNode } from "../../types";
import { ROOT_IDX } from "../../util/const";

// 这里在网页内容发生变化后，可能会存在一定的问题，需要后面修复
export const getTextChildByOffset = ($parent: Node, offset: number): DomNode => {
  const nodeStack: Node[] = [$parent];

  let $curNode: Node | null | undefined = null;
  let curOffset = 0;
  let startOffset = 0;

  while (($curNode = nodeStack.pop())) {
    const children = $curNode.childNodes;

    for (let i = children.length - 1; i >= 0; i--) {
      nodeStack.push(children[i]);
    }

    if ($curNode.nodeType === 3 && $curNode.textContent) {
      startOffset = offset - curOffset;
      curOffset += $curNode.textContent.length;

      if (curOffset >= offset) {
        break;
      }
    }
  }

  if (!$curNode) {
    $curNode = $parent;
  }

  return {
    $node: $curNode,
    offset: startOffset,
  };
};

/**
 * get start and end parent element from meta info
 *
 * @param {HighlightSource} hs
 * @param {HTMLElement | Document} $root root element, default document
 * @return {Object}
 */
export const queryElementNode = (hs: HighlightSource, $root: Document | HTMLElement): { start: Node; end: Node } => {
  const start =
    hs.startMeta.parentIndex === ROOT_IDX
      ? $root
      : $root.getElementsByTagName(hs.startMeta.parentTagName)[hs.startMeta.parentIndex];
  const end =
    hs.endMeta.parentIndex === ROOT_IDX
      ? $root
      : $root.getElementsByTagName(hs.endMeta.parentTagName)[hs.endMeta.parentIndex];

  return { start, end };
};
