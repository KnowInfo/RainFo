// StrikethroughOverlay.js
import React, { useEffect } from 'react';

const StrikethroughOverlay = ({ text, onConfirm, onCancel }) => {
  useEffect(() => {
    // 组件卸载时的逻辑
    return () => {
      // 这里可以执行一些清理工作
    };
  }, []);

  return (
    <div className="strikethrough-overlay">
      <div className="overlay-content">
        <p>{text}</p>
        <button onClick={onConfirm}>确认</button>
        <button onClick={onCancel}>取消</button>
      </div>
    </div>
  );
};

export default StrikethroughOverlay;
