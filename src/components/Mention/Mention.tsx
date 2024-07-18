import { notification } from "antd";
import { useDocumentData } from "../../contexts/DocumentDataContext.tsx";
import { MentionItem, RelationItem, SelectedToken, Token } from "../../interfaces/interfaces.ts";
import BondaryButton from "../Buttons/BoundaryButton.tsx";
import { mentionColors } from "../Annotation/mentionConfig.ts";
import React from "react";
import { ArcherElement } from "react-archer";
import { relationTypes } from "../RelationEditor/RelationConfig.ts";
import { EyeInvisibleOutlined, EyeOutlined } from "@ant-design/icons";
import logger, { EventActionType } from "../../utils/eventLogger.ts";
import { Workflow } from "../../utils/workflow_enum.ts";



type Direction = 'left' | 'right';
type Adjustment = 'extend' | 'decrease';
type AnchorPosition = 'top' | 'bottom' | 'left' | 'right';
type ValidLineStyles = 'angle' | 'straight' | 'curve';



interface RenderMentionProps {
    mention: MentionItem;
    index: number;
    toggleMentionSelection: (mentionId: string) => void;
    relationList: RelationItem[];
    selectedMentions: MentionItem[];
    suggestedMention: MentionItem | undefined;
    setSelectedMentions: React.Dispatch<React.SetStateAction<MentionItem[]>>;
    mentionList: MentionItem[];
    setSelectedTokens: React.Dispatch<React.SetStateAction<SelectedToken[]>>;
    currentStep: number;
}

const RenderMention = ({ mention, toggleMentionSelection, relationList, selectedMentions, setSelectedMentions, mentionList, suggestedMention, setSelectedTokens, currentStep }: RenderMentionProps) => {
    const { documentData, performAction } = useDocumentData();
    const [showRelations, setShowRelations] = React.useState<boolean>(currentStep === Workflow.COMPLETE ? true : false);

    const mentionTag = mention.tag;
    const mentionTagColor = mentionColors[mentionTag];
    const isLastToken = (token: Token) => mention.token_indices[mention.token_indices.length - 1] === token.index_in_sentence;

    const isSelected = selectedMentions.some(selectedMention =>
        selectedMention.id === mention.id
    );

    const isSuggested = suggestedMention?.id === mention.id;

    const toggleShowRelations = () => setShowRelations(prev => !prev);

    const updateMention = (direction: Direction, adjustment: Adjustment) => {
        if (!documentData) return;

        // Create a deep copy of documentData
        const clonedData = structuredClone(documentData);

        const mentionIndex = clonedData.mentions.findIndex(m => m.id === mention.id);
        if (mentionIndex === -1) return;
        const sentenceIndex = clonedData.sentences.findIndex((_, idx) => idx === clonedData.mentions[mentionIndex].sentence_index);
        if (sentenceIndex === -1) return;

        const mentionToUpdate = clonedData.mentions[mentionIndex];
        const tokensToUpdate = clonedData.sentences[sentenceIndex].tokens;

        if (direction === 'left') {
            const firstTokenIndex = mentionToUpdate.token_indices[0];
            const firstTokenDocumentIndex = mentionToUpdate.tokenInDocumentIndices[0];
            if (adjustment === 'extend' && firstTokenIndex > 0) {
                const newStartIndex = mentionToUpdate.token_indices[0] - 1;
                if (newStartIndex >= 0 && !isTokenPartOfAnyMention(newStartIndex, sentenceIndex)) {
                    mentionToUpdate.token_indices.unshift(firstTokenIndex - 1);
                    mentionToUpdate.tokenInDocumentIndices.unshift(firstTokenDocumentIndex - 1);
                }
                else {
                    notification.warning({
                        message: 'Extension Not Possible',
                        description: 'Cannot extend the mention in this direction.',
                    });
                    return;
                }
            }
            else if (adjustment === 'decrease' && mentionToUpdate.token_indices.length > 1) {
                mentionToUpdate.token_indices.shift();
                mentionToUpdate.tokenInDocumentIndices.shift();
            }
            else {
                notification.warning({
                    message: 'Extension Not Possible',
                    description: 'Cannot extend the mention in this direction.',
                });
                return;
            }
        }
        else if (direction === 'right') {
            const lastTokenIndex = mentionToUpdate.token_indices[mentionToUpdate.token_indices.length - 1];
            const lastTokenDocumentIndex = mentionToUpdate.tokenInDocumentIndices[mentionToUpdate.tokenInDocumentIndices.length - 1];
            if (adjustment === 'extend' && lastTokenIndex < clonedData.sentences[mentionToUpdate.sentence_index].tokens.length - 1) {
                const newEndIndex = lastTokenIndex + 1;
                if (newEndIndex < tokensToUpdate.length && !isTokenPartOfAnyMention(newEndIndex, sentenceIndex)) {

                    mentionToUpdate.token_indices.push(lastTokenIndex + 1);
                    mentionToUpdate.tokenInDocumentIndices.push(lastTokenDocumentIndex + 1);
                }
                else {
                    notification.warning({
                        message: 'Extension Not Possible',
                        description: 'Cannot extend the mention to the right.',
                    });
                    return;
                }
            }
            else if (adjustment === 'decrease' && mentionToUpdate.token_indices.length > 1) {
                mentionToUpdate.token_indices.pop();
                mentionToUpdate.tokenInDocumentIndices.pop();
            }
            else {
                notification.warning({
                    message: 'Extension Not Possible',
                    description: 'Cannot decrease the mention to the left.',
                });
                return;
            }
        }
        performAction(clonedData);

        const updatedMention = mentionList.find(m => m.id === mention.id);

        if (updatedMention) {
            setSelectedMentions(currentSelectedMentions =>
                currentSelectedMentions.map(m => m.id === updatedMention.id ? updatedMention : m)
            );
        }

        logger.logEvent({
            timestamp: Date.now(),
            action: EventActionType.MENTION_SUGGESTION_BOUNDS_UPDATED,
            data: mention,
        });
        setSelectedTokens([]);

    }

    function isTokenPartOfAnyMention(tokenIndex: number, sentenceIndex: number) {
        return mentionList.some(mention => mention.token_indices.includes(tokenIndex) && mention.sentence_index === sentenceIndex);
    }


    const getDisplayNameForTag = (tag: string) => {
        const typeObj = relationTypes.find(type => type.tag === tag);
        return typeObj ? typeObj.displayName : tag;
    };

    const relationsForThisMention = (isSelected && showRelations) ? relationList
        .filter(relation => relation.headID.includes(mention.id))
        .map(relation => ({
            targetId: relation.tailID,
            targetAnchor: 'middle' as AnchorPosition,
            sourceAnchor: 'bottom' as AnchorPosition,
            style: {
                strokeColor: 'white',
                strokeWidth: 1,
                noCurves: false,
                endMarker: true,
                offset: 0,
                endShape: {
                    circle: {
                        radius: 3,
                        fillColor: 'white',
                        strokeColor: 'black',
                    }
                }, lineStyle: 'angle' as ValidLineStyles,
            },
            label: <div
                style={{
                    fontSize: '9px',
                    background: 'black',
                    color: 'white',
                    border: '1px solid white',
                    borderRadius: '5px',
                    padding: '0px 2px 0px 2px',
                }}>{getDisplayNameForTag(relation.tag)}
            </div>
        }))
        : [];


    return (
        <ArcherElement id={mention.id} relations={relationsForThisMention}>
                <span style={{
                    display: 'inline-block',
                    lineHeight: '1.2',
                    filter: (mention.suggestion && !isSuggested) ? "saturate(25%)" : '',
                    animation: isSuggested ? 'pulseBorder 1.5s infinite' : 'none',
                }}>
                    {isSelected && <div style={{
                        display: 'inline-flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        marginRight: '1px',
                        marginBottom: '2px',
                        verticalAlign: 'middle'
                    }}>
                        <BondaryButton
                            direction="left"
                            onClick={() => updateMention('left', 'extend')}
                        />
                        <BondaryButton
                            direction="right"
                            onClick={() => updateMention('left', 'decrease')}
                        />
                    </div>}
                    <span style={{
                        backgroundColor: mentionTagColor,
                        border: (isSelected || isSuggested) ? '2px solid white' : '2px solid transparent',
                        borderRadius: '5px',
                        display: 'inline-block',
                        lineHeight: '1.2',
                        paddingLeft: '1px',
                        cursor: !mention.suggestion ? 'pointer' : 'default',
                    }} onClick={!mention.suggestion ? () => toggleMentionSelection(mention.id) : undefined}>
                        {mention.tokens.map((token, tokenIndex) => {
                            return (
                                <React.Fragment key={`${mention.id}-${tokenIndex}`}>
                                    <span style={{ color: 'black' }}>
                                        {token.text}
                                        &nbsp;
                                    </span>
                                    {isLastToken(token) && <span className="entity-tag">{mentionTag}</span>}
                                    {isSelected && isLastToken(token) && (
                                        showRelations ? (
                                            <EyeOutlined onClick={(e) => {
                                                e.stopPropagation();
                                                toggleShowRelations();
                                            }} />
                                        ) : (
                                            <EyeInvisibleOutlined onClick={(e) => {
                                                e.stopPropagation();
                                                toggleShowRelations();
                                            }} />)
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </span>
                    {isSelected && <div style={{
                        display: 'inline-flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        marginRight: '1px',
                        marginBottom: '2px',
                        verticalAlign: 'middle'
                    }}>
                        <BondaryButton
                            direction="right"
                            onClick={() => updateMention('right', 'extend')}
                        />
                        <BondaryButton
                            direction="left"
                            onClick={() => updateMention('right', 'decrease')}
                        />
                    </div>}
                </span>
        </ArcherElement>
    );
}

export default RenderMention;