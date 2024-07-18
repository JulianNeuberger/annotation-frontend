import { useDocumentData } from "../../contexts/DocumentDataContext.tsx";
import { Skeleton, notification, Typography, Flex, Switch, Button } from "antd";
import { Token, SelectedToken, MentionItem, RelationItem } from "../../interfaces/interfaces.ts";
import "./AnnotatedText.css";
import React, { useEffect, useState } from "react";
import logger, { EventActionType } from "../../utils/eventLogger.ts";
import ControlPanel from "../ControlPanel/ControlPanel.tsx";
import RenderMention from "../Mention/Mention.tsx";
import { ArcherContainer } from "react-archer";
import MentionSuggestionContainer from "../MentionSuggestionContainer/MentionSuggestionContainer.tsx";
import { Workflow } from "../../utils/workflow_enum.ts";
import VisiualizedProgressContainer from "../VisualizedProgressContainer/VisiualizedProgressContainer.tsx";
import useClickOutside from "../../hooks/useClickoutside.tsx";

const { Title } = Typography;

interface EntityEditorProps {
  selectedTokens: SelectedToken[];
  setSelectedTokens: React.Dispatch<React.SetStateAction<SelectedToken[]>>;
  selectedMentions: MentionItem[];
  setSelectedMentions: React.Dispatch<React.SetStateAction<MentionItem[]>>;
  mentionList: MentionItem[];
  relationList: RelationItem[];
  isLoading: boolean;
  currentStep: number;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  withVisualizedProgress: boolean;
}

const AnnotatedText = ({ selectedMentions, setSelectedMentions, selectedTokens, setSelectedTokens, mentionList, relationList, isLoading, currentStep, setCurrentStep, withVisualizedProgress }: EntityEditorProps) => {
  const { documentData, clearUndoRedoStacks } = useDocumentData();
  const sentences = documentData?.sentences || [];


  const [activeSentenceIndex, setActiveSentenceIndex] = useState<number | null>(null);
  const [suggestedMention, setSuggestedMention] = useState<MentionItem | undefined>(undefined);
  const [showAllMentions, setShowAllMentions] = useState<boolean>(true);
  const [hasSuggestions, setHasSuggestions] = useState<boolean>(true);


  useEffect(() => {
    let newActiveSentenceIndex = null;
    if (selectedTokens.length > 0) {
      newActiveSentenceIndex = selectedTokens[0].token.sentence_index;
    } else if (selectedMentions.length > 0) {
      newActiveSentenceIndex = selectedMentions[0].sentence_index;
    }
    setActiveSentenceIndex(newActiveSentenceIndex);
  }, [selectedTokens, selectedMentions]);


  useEffect(() => {
    const updateHasSuggestions = () => {
      const mentions = documentData?.mentions || [];
      const hasMentionSuggestions = mentions.some(mention => mention.suggestion);
      setHasSuggestions(hasMentionSuggestions);
    };

    updateHasSuggestions();
  }, [documentData?.mentions]);


  const onSwitchChange = (checked: boolean) => {
    setShowAllMentions(checked);
  }


  const toggleMentionSelection = (mentionId: string) => {
    const mentionItem = mentionList.find(m => m.id === mentionId);
    if (!mentionItem) return;

    const isAlreadySelected = selectedMentions.some(selected => selected.id === mentionId);

    if (isAlreadySelected) {
      logger.logEvent({
        timestamp: Date.now(),
        action: EventActionType.MENTION_DESELECTED,
        data: mentionItem,
      });
      setSelectedMentions(current => current.filter(m => m.id !== mentionId));
    } else {
      logger.logEvent({
        timestamp: Date.now(),
        action: EventActionType.MENTION_SELECTED,
        data: mentionItem,
      });
      setSelectedMentions(current => [...current, mentionItem]);
      setSelectedTokens([]);
    }
  }


  const toggleTokenSelection = (selectedToken: Token, tokenIndexInSentence: number): void => {
    let updatedSelectedTokens: SelectedToken[];

    const isSelected = selectedTokens.some(st =>
      st.token.index_in_document === selectedToken.index_in_document
    );

    if (isSelected) {
      logger.logEvent({
        timestamp: Date.now(),
        action: EventActionType.TOKEN_DESELECTED,
        data: selectedToken,
      });
      updatedSelectedTokens = selectedTokens.filter(st =>
        st.token.index_in_document !== selectedToken.index_in_document
      );
    } else {
      if (selectedTokens.length > 0) {
        const isAdjacent = selectedTokens.some(st =>
          (Math.abs(st.token.index_in_sentence - tokenIndexInSentence) === 1) &&
          st.token.sentence_index === selectedToken.sentence_index
        );
        if (!isAdjacent) {

          notification.warning({
            message: 'Selection Error',
            description: 'Can only select adjacent tokens within the same sentence.',
          });
          return;
        }
      }
      logger.logEvent({
        timestamp: Date.now(),
        action: EventActionType.TOKEN_SELECTED,
        data: selectedToken,
      })
      updatedSelectedTokens = [...selectedTokens, { token: selectedToken, tokenIndexInSentence }];
      setSelectedMentions([]);
    }

    updatedSelectedTokens.sort((a, b) => a.token.index_in_document - b.token.index_in_document);
    setSelectedTokens(updatedSelectedTokens);
  };


  const renderToken = (token: Token) => {
    const isSelected = selectedTokens.some(st =>
      st.token.index_in_document === token.index_in_document
    );
    return (
      <React.Fragment key={token.index_in_document} >
        <span style={{
          border: isSelected ? '2px solid white' : '2px solid transparent',
          borderRadius: '5px',
          display: 'inline-block',
        }}
          onClick={() => toggleTokenSelection(token, token.index_in_sentence)}>
          {token.text}
        </span>
        &nbsp;
      </React.Fragment>
    );
  };


  const resetSelection = () => {
    setSelectedTokens([]);
    setSelectedMentions([]);
  };

  const ref = useClickOutside<HTMLDivElement>(resetSelection);

  return (
    <>
      <Flex justify="space-between">
        <Title level={4} style={{ marginTop: '0px', marginBottom: '0px' }}>Annotated Text</Title>
        {hasSuggestions && <Switch checkedChildren="Show Single" unCheckedChildren="Show All" defaultChecked onChange={onSwitchChange} />}
        {currentStep === Workflow.MENTION && <Button onClick={() => {
          setCurrentStep(Workflow.ENTITIES);
          clearUndoRedoStacks();
        }}>Next Step</Button>}
        {currentStep === Workflow.ENTITIES && <Button onClick={() => {
          setCurrentStep(Workflow.RELATION_SUGGESTION);
          clearUndoRedoStacks();
        }}>Next Step</Button>}
      </Flex>
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : sentences.length > 0 ? (
        <>
          {currentStep === Workflow.MENTION_SUGGESTION && <MentionSuggestionContainer
            mentionList={mentionList}
            setSuggestedMention={setSuggestedMention}
            selectedTokens={selectedTokens}
            setSelectedTokens={setSelectedTokens}
            suggestedMention={suggestedMention}
            showAllMentions={showAllMentions}
            hasSuggestions={hasSuggestions}
            setHasSuggestions={setHasSuggestions}
            setCurrentStep={setCurrentStep}
            toggleTokenSelection={toggleTokenSelection}
          />}
          {(currentStep === Workflow.MENTION || currentStep === Workflow.ENTITIES || currentStep === Workflow.COMPLETE || !showAllMentions) && <ArcherContainer strokeColor="white">
            <div ref={ref} className="annotated-text-container">
              {sentences.map((sentence, sentenceIndex) => (
                <div key={sentenceIndex} className="sentence" style={{}}>
                  {activeSentenceIndex === sentenceIndex && (
                    <ControlPanel
                      selectedTokens={selectedTokens}
                      setSelectedTokens={setSelectedTokens}
                      selectedMentions={selectedMentions}
                      setSelectedMentions={setSelectedMentions}
                      mentionList={mentionList}
                      currentStep={currentStep}
                    />
                  )}
                  <span className="sentence-index">{sentenceIndex + 1}: </span>
                  {sentence.tokens.map((token, tokenIndex) => {

                    const mention = mentionList.find(m =>
                      m.sentence_index === sentenceIndex && m.token_indices.includes(token.index_in_sentence)
                    );
                    if (mention) {
                      if (mention.token_indices[0] === token.index_in_sentence) {
                        return (
                          <>
                            <RenderMention
                              key={mention.id}
                              mention={mention}
                              relationList={relationList}
                              mentionList={mentionList}
                              index={tokenIndex}
                              setSelectedTokens={setSelectedTokens}
                              toggleMentionSelection={toggleMentionSelection}
                              selectedMentions={selectedMentions}
                              setSelectedMentions={setSelectedMentions}
                              suggestedMention={suggestedMention}
                              currentStep={currentStep}
                            />
                            &nbsp;
                          </>)
                      }
                      return null;
                    } else {
                      return renderToken(token);
                    }
                  })}
                </div>
              ))}
            </div>
          </ArcherContainer>}
        </>
      ) : null}
      {withVisualizedProgress && <VisiualizedProgressContainer />}
    </>
  );
};

export default AnnotatedText;