import React, { ReactNode, createContext, useContext, useState } from 'react';
import { DocumentData } from '../interfaces/interfaces.ts';
import { notification } from 'antd';
import logger, { EventActionType } from '../utils/eventLogger.ts';

interface DocumentDataContextType {
  documentData: DocumentData | null;
  setDocumentData: React.Dispatch<React.SetStateAction<DocumentData | null>>;
  performAction: (newData: DocumentData) => void;
  undoAction: () => void;
  redoAction: () => void;
  clearUndoRedoStacks: () => void;
}

export const DocumentDataContext = createContext<DocumentDataContextType>({
  documentData: null,
  setDocumentData: () => { },
  performAction: () => { },
  undoAction: () => { },
  redoAction: () => { },
  clearUndoRedoStacks: () => { },
});

interface DocumentDataProviderProps {
  children: ReactNode;
}


export const DocumentDataProvider = ({ children }: DocumentDataProviderProps) => {
  const [documentData, setDocumentData] = useState<DocumentData | null>(null);
  const [undoStack, setUndoStack] = useState<DocumentData[]>([]);
  const [redoStack, setRedoStack] = useState<DocumentData[]>([]);

  const performAction = (newData: DocumentData) => {
    if (documentData !== null) {
      setUndoStack(current => [...current, documentData]);
    }
    setRedoStack([]);
    setDocumentData(newData);
  };


  const undoAction = () => {
    if (undoStack.length === 0) {
      notification.info({
        message: 'Undo stack is empty',
      });
      return;
    }
    const prevState = undoStack.pop();
    setUndoStack([...undoStack]);
    if (prevState !== undefined) {
      if (documentData !== null) {
        setRedoStack(current => [...current, documentData]);
      }
      setDocumentData(prevState);
    }
    logger.logEvent({
      timestamp: Date.now(),
      action: EventActionType.UNDO_ACTION,
    })
  };

  const redoAction = () => {
    if (redoStack.length === 0) {
      notification.info({
        message: 'Redo stack is empty',
      });
      return;
    }
    const nextState = redoStack.pop();
    setRedoStack([...redoStack]);
    if (nextState !== undefined) {
      if (documentData !== null) {
        setUndoStack(current => [...current, documentData]);
      }
      setDocumentData(nextState);
    }
    logger.logEvent({
      timestamp: Date.now(),
      action: EventActionType.REDO_ACTION,
    })
  };

  const clearUndoRedoStacks = () => {
    setUndoStack([]);
    setRedoStack([]);
  }

  return (
    <DocumentDataContext.Provider value={{ documentData, setDocumentData, performAction, undoAction, redoAction, clearUndoRedoStacks }}>
      {children}
    </DocumentDataContext.Provider>
  );
};

export const useDocumentData = () => useContext(DocumentDataContext);