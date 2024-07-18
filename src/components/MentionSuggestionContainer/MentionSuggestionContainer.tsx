import { Affix, Button, Card, Flex, Popconfirm, Select, Typography, notification } from "antd";
import { useDocumentData } from "../../contexts/DocumentDataContext.tsx";
import logger, { EventActionType } from "../../utils/eventLogger.ts";
import { Entity, Mention, MentionItem, SelectedToken, Token } from "../../interfaces/interfaces.ts";
import { useEffect, useMemo, useState } from "react";
import BondaryButton from "../Buttons/BoundaryButton.tsx";
import React from "react";
import { mentionColors } from "../Annotation/mentionConfig.ts";
import { Workflow } from "../../utils/workflow_enum.ts";
import { useHotkeys } from "react-hotkeys-hook";
import { v4 as uuidv4 } from 'uuid';
import './styles.css';

const { Title } = Typography;

type Direction = 'left' | 'right';
type Adjustment = 'extend' | 'decrease';


const data = [
    { value: 'actor', label: 'Actor' },
    { value: 'activity', label: 'Activity' },
    { value: 'activity data', label: 'Activity Data' },
    { value: 'xor gateway', label: 'XOR Gateway' },
    { value: 'and gateway', label: 'AND Gateway' },
    { value: 'further specification', label: 'Further Specification' },
    { value: 'condition specification', label: 'Condition Specification' },
];

interface MentionSuggestionContainerProps {
    mentionList: MentionItem[];
    setSuggestedMention: React.Dispatch<React.SetStateAction<MentionItem | undefined>>;
    suggestedMention: MentionItem | undefined;
    showAllMentions: boolean;
    hasSuggestions: boolean;
    setHasSuggestions: React.Dispatch<React.SetStateAction<boolean>>;
    setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
    setSelectedTokens: React.Dispatch<React.SetStateAction<SelectedToken[]>>;
    toggleTokenSelection: (selectedToken: Token, tokenIndexInSentence: number) => void;
    selectedTokens: SelectedToken[];
}

const MentionSuggestionContainer = ({ mentionList, setSuggestedMention, suggestedMention, showAllMentions, hasSuggestions, setHasSuggestions, setCurrentStep, setSelectedTokens, toggleTokenSelection, selectedTokens }: MentionSuggestionContainerProps) => {
    const { documentData, setDocumentData, performAction, clearUndoRedoStacks } = useDocumentData();
    const mentions = useMemo(() => documentData?.mentions || [], [documentData?.mentions]);
    const sentences = useMemo(() => documentData?.sentences || [], [documentData?.sentences]);
    const [selectedTag, setSelectedTag] = useState<string>('');
    const [hasMovedToNextStep, setHasMovedToNextStep] = useState(false);

    
    useHotkeys('enter', () => {
        if (hasSuggestions) {
            handleAcceptMention(sortedMentionList[0].id);
        }
    })

    useHotkeys('backspace', () => {
        if (hasSuggestions) {
            handleRejectMention(sortedMentionList[0].id);
        }
    });

    useHotkeys('a', () => {
        if (hasSuggestions) {
            updateMention(sortedMentionList[0], 'left', 'extend');
        }
    });

    useHotkeys('d', () => {
        if (hasSuggestions) {
            console.log('d');
            updateMention(sortedMentionList[0], 'right', 'extend');
        }
    });

    useHotkeys('q', () => {
        if (hasSuggestions) {
            updateMention(sortedMentionList[0], 'left', 'decrease');
        }
    });

    useHotkeys('e', () => {
        if (hasSuggestions) {
            updateMention(sortedMentionList[0], 'right', 'decrease');
        }
    })

    useEffect(() => {
        const updateHasSuggestions = () => {
            const remainingSuggestions = mentions.filter(mention => mention.suggestion).length;
            setHasSuggestions(remainingSuggestions > 0);
        };

        updateHasSuggestions();
    }, [mentions, setHasSuggestions]);


    const sortedMentionList = useMemo(() => {
        const suggestedMentions = mentionList.filter(mention => mention.suggestion);
        return suggestedMentions.sort((a, b) => {
            return a.tokens[0].index_in_document - b.tokens[0].index_in_document;
        });
    }, [mentionList]);


    useEffect(() => {
        if (sortedMentionList.length > 0) {
            setSelectedTag(sortedMentionList[0]?.tag);
        }
    }, [sortedMentionList]);


    useEffect(() => {
        if (sortedMentionList.length > 0) {
            setSuggestedMention(sortedMentionList[0]);
        }
    }, [sortedMentionList, setSuggestedMention]);


    useEffect(() => {
        if (sortedMentionList.length === 0 && !hasMovedToNextStep) {
            setCurrentStep(Workflow.MENTION);
            setHasMovedToNextStep(true);
            clearUndoRedoStacks();
        }
    }, [sortedMentionList, setCurrentStep, hasMovedToNextStep, clearUndoRedoStacks]);


    const handleAcceptMention = (mentionId: string) => {
        if (!documentData) return;

        const clonedData = structuredClone(documentData);

        const mentionIndex = clonedData.mentions.findIndex(m => m.id === mentionId);
        if (mentionIndex === -1) return;

        clonedData.mentions[mentionIndex] = {
            ...clonedData.mentions[mentionIndex],
            suggestion: false,
        };

        clonedData.acceptedMentions[1] += 1;

        performAction(clonedData);

        notification.success({
            message: 'Mention Accepted',
            description: 'The mention has been successfully accepted.',
        });

        logger.logEvent({
            timestamp: Date.now(),
            action: EventActionType.MENTION_SUGGESTION_ACCEPTED,
            data: clonedData.mentions[mentionIndex],
        });

        setSuggestedMention(undefined);
    };


    const handleRejectMention = (mentionId: string) => {
        if (!documentData) return;

        const clonedData = structuredClone(documentData);

        const mentionIndexToRemove = clonedData.mentions.findIndex(mention => mention.id === mentionId);
        if (mentionIndexToRemove === -1) {
            return;
        }

        clonedData.relations = clonedData.relations
            .filter(relation => relation.head !== mentionIndexToRemove && relation.tail !== mentionIndexToRemove)
            .map(relation => ({
                ...relation,
                head: relation.head > mentionIndexToRemove ? relation.head - 1 : relation.head,
                tail: relation.tail > mentionIndexToRemove ? relation.tail - 1 : relation.tail
            })) || [];

        clonedData.entities = clonedData.entities.map(entity => {
            const filteredMentionIndices = entity.mention_indices.filter(index => index !== mentionIndexToRemove);
            const finalMentionIndices = filteredMentionIndices.map(index => {
                return index > mentionIndexToRemove ? index - 1 : index;
            });
            return { ...entity, mention_indices: finalMentionIndices };
        });

        const mentionToRemove = clonedData.mentions[mentionIndexToRemove];
        clonedData.mentions = clonedData.mentions.filter((_, index) => index !== mentionIndexToRemove);
        clonedData.entities = clonedData.entities.filter(cluster => cluster.mention_indices.length > 0);

        performAction(clonedData);

        notification.success({
            message: 'Mention Rejected',
            description: 'The mention has been successfully deleted.',
        });

        logger.logEvent({
            timestamp: Date.now(),
            action: EventActionType.MENTION_SUGGESTION_REJECTED,
            data: mentionToRemove,
        });

        setSuggestedMention(undefined);
    };


    const handleRejectAllMentions = () => {
        setDocumentData(prevData => {
            if (!prevData) return null;

            const mentionsToReject = prevData.mentions.filter(m => m.suggestion);

            let updatedRelations = [...prevData.relations];
            let updatedEntities = [...prevData.entities];
            let updatedMentions = [...prevData.mentions];

            mentionsToReject.forEach(mentionToRemove => {
                const mentionIndexToRemove = updatedMentions.findIndex(mention => mention.id === mentionToRemove.id);

                updatedRelations = documentData?.relations
                    .filter(relation => relation.head !== mentionIndexToRemove && relation.tail !== mentionIndexToRemove)
                    .map(relation => ({
                        ...relation,
                        head: relation.head > mentionIndexToRemove ? relation.head - 1 : relation.head,
                        tail: relation.tail > mentionIndexToRemove ? relation.tail - 1 : relation.tail
                    })) || [];

                updatedEntities = prevData.entities.map(entity => {
                    const filteredMentionIndices = entity.mention_indices.filter(index => index !== mentionIndexToRemove);
                    const finalMentionIndices = filteredMentionIndices.map(index => {
                        return index > mentionIndexToRemove ? index - 1 : index;
                    });
                    return { ...entity, mention_indices: finalMentionIndices };
                });

                updatedMentions = updatedMentions.filter((_, index) => index !== mentionIndexToRemove);

                logger.logEvent({
                    timestamp: Date.now(),
                    action: EventActionType.MENTION_SUGGESTION_REJECTED,
                    data: mentionToRemove,
                });
            });

            notification.success({
                message: 'All New Mention Suggestions Rejected',
                description: 'All new mention suggestions have been successfully deleted.',
            });

            return {
                ...prevData,
                mentions: updatedMentions,
                entities: updatedEntities,
                relations: updatedRelations
            };
        });

        logger.logEvent({
            timestamp: Date.now(),
            action: EventActionType.MENTION_SUGGESTION_REJECTED_ALL,
        });
        setSuggestedMention(undefined);
    };


    const handleAcceptAllMentions = () => {
        setDocumentData(prevData => {
            if (!prevData) return null;

            const mentionsToAccept = prevData.mentions.filter(m => m.suggestion);

            const updatedMentions = prevData.mentions.map(m =>
                mentionsToAccept.find(mention => mention.id === m.id) ? { ...m, suggestion: false } : m
            );

            mentionsToAccept.forEach(m => {
                logger.logEvent({
                    timestamp: Date.now(),
                    action: EventActionType.MENTION_SUGGESTION_ACCEPTED,
                    data: m,
                });
            });

            return { ...prevData, mentions: updatedMentions };
        });

        notification.success({
            message: 'All New Mention Suggestions Accepted',
            description: 'All new mention suggestions have been accepted.',
        });

        logger.logEvent({
            timestamp: Date.now(),
            action: EventActionType.MENTION_SUGGESTION_ACCEPTED_ALL,
        });
        setSuggestedMention(undefined);
    };


    const updateMention = (mention: MentionItem, direction: Direction, adjustment: Adjustment) => {
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
                        description: 'Cannot extend the mention in this direction.',
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
                    description: 'Cannot extend the mention in this direction.',
                });
                return;
            }
        }
        performAction(clonedData);

        logger.logEvent({
            timestamp: Date.now(),
            action: EventActionType.MENTION_SUGGESTION_BOUNDS_UPDATED,
            data: mentionToUpdate,
        });

        setSelectedTokens([]);
    }

    const handleUpdateMentionType = (newType: string, mentionId: string) => {

        const mentionIndex = mentions.findIndex(mention => mention.id === mentionId);

        if (mentionIndex !== undefined && mentionIndex >= 0) {
            if (!documentData) return;
            const clonedData = structuredClone(documentData);

            clonedData.mentions[mentionIndex] = {
                ...clonedData.mentions[mentionIndex],
                tag: newType,
            };

            performAction(clonedData);

            logger.logEvent({
                timestamp: Date.now(),
                action: EventActionType.MENTION_SUGGESTION_TYPE_UPDATED,
                data: clonedData.mentions[mentionIndex],

            });

            notification.success({
                message: 'Mention Updated',
                description: 'The mention type has been successfully updated.',
            });

            setSelectedTag(newType);
        } else {
            notification.error({
                message: 'Update Error',
                description: 'The selected mention could not be updated.',
            });
        }
    }


    function isTokenPartOfAnyMention(tokenIndex: number, sentenceIndex: number) {
        return mentionList.some(mention => mention.token_indices.includes(tokenIndex) && mention.sentence_index === sentenceIndex);
    }


    const handleCreateMention = (entityType: string) => {
        if (!documentData) return;

        const clonedData = structuredClone(documentData);

        const sentenceIndex = selectedTokens[0]?.token.sentence_index;
        const newMention: Mention = {
            id: uuidv4(),
            tag: entityType,
            sentence_index: sentenceIndex,
            token_indices: selectedTokens.map(st => st.tokenIndexInSentence),
            tokenInDocumentIndices: selectedTokens.map(st => st.token.index_in_document),
            suggestion: false,
        };

        const newEntity: Entity = {
            mention_indices: [mentions.length],
        }

        clonedData.mentions.push(newMention);
        clonedData.entities.push(newEntity);

        performAction(clonedData);

        logger.logEvent({
            timestamp: Date.now(),
            action: EventActionType.MENTION_CREATED,
            data: newMention,
        });

        setSelectedTokens([]);
        notification.success({
            message: 'Mention Created',
            description: 'A new mention has been successfully created.',
        });
    };


    const renderMention = (mention: MentionItem, isSelected: boolean) => {
        const mentionTag = mention.tag;
        const isSuggested = mention.suggestion;
        const mentionTagColor = mentionColors[mentionTag];
        const isLastToken = (token: Token) => mention.token_indices[mention.token_indices.length - 1] === token.index_in_sentence;

        return (
            <>
                <span style={{
                    backgroundColor: mentionTagColor,
                    border: isSelected ? '2px solid white' : '2px solid transparent',
                    borderRadius: '5px',
                    display: 'inline-block',
                    lineHeight: '1.2',
                    paddingLeft: '1px',
                    filter: (isSuggested && !isSelected) ? 'saturate(25%)' : '',
                    animation: isSelected ? 'pulseBorder 1.5s infinite' : 'none',
                }}>
                    {mention.tokens.map((token, tokenIndex) => {
                        return (
                            <React.Fragment key={`${mention.id}-${tokenIndex}`}>
                                <span style={{ color: 'black' }}>
                                    {token.text}
                                    &nbsp;
                                </span>
                                {isLastToken(token) && <span className="entity-tag">{mentionTag}</span>}
                            </React.Fragment>
                        );
                    })}
                </span>
                &nbsp;
            </>
        )
    }


    const renderToken = (token: Token) => {
        const isSelected = selectedTokens.some(st =>
            st.token.index_in_document === token.index_in_document
        );
        return (
            <React.Fragment key={token.index_in_document} >
                <span style={{
                    border: isSelected ? '2px solid white' : '2px solid transparent',
                    borderRadius: '5px',
                }}
                    onClick={() => toggleTokenSelection(token, token.index_in_sentence)}>
                    {token.text}
                </span>
                &nbsp;
            </React.Fragment>
        );
    };

    const TokenPanel = () => {
        useHotkeys('1', () => {
            if (selectedTokens.length > 0) {
                handleCreateMention('actor');
            }
        });

        useHotkeys('2', () => {
            if (selectedTokens.length > 0) {
                handleCreateMention('activity');
            }
        });

        useHotkeys('3', () => {
            if (selectedTokens.length > 0) {
                handleCreateMention('activity data');
            }
        });

        useHotkeys('4', () => {
            if (selectedTokens.length > 0) {
                handleCreateMention('xor gateway');
            }
        });

        useHotkeys('5', () => {
            if (selectedTokens.length > 0) {
                handleCreateMention('and gateway');
            }
        });

        useHotkeys('6', () => {
            if (selectedTokens.length > 0) {
                handleCreateMention('further specification');
            }
        });

        useHotkeys('7', () => {
            if (selectedTokens.length > 0) {
                handleCreateMention('condition specification');
            }
        });


        return (
            <div style={{
                position: 'absolute',
                width: '90%',
                marginTop: '-25vh',
                border: '1px solid #d9d9d9',
                borderRadius: '5px',
                backgroundColor: '#141414',
                padding: '10px',
            }}>
                <Flex justify="center">
                    <Title level={4} style={{ marginTop: '0px' }}>Select Entity Type</Title>
                </Flex>
                <Flex gap='small' wrap="wrap" justify="space-evenly">
                    {Object.entries(mentionColors).map(([entityType, color]) => (
                        <Button
                            key={entityType}
                            style={{ backgroundColor: color, color: 'black', }}
                            onClick={() => handleCreateMention(entityType)}
                        >
                            {entityType}
                        </Button>
                    ))}
                </Flex>
            </div>
        )
    }


    const sentenceIndex = sortedMentionList.length > 0 ? sortedMentionList[0].sentence_index : null;
    const sentence = sentenceIndex != null ? sentences[sentenceIndex] : null;

    return (
        <>
            {hasSuggestions && <Affix offsetTop={100}>
                <Card>
                    {sentence && showAllMentions && <Card style={{ marginTop: '10px', marginBottom: '10px' }}>
                        {selectedTokens.length > 0 && <TokenPanel />}
                        <span style={{ lineHeight: '2' }}>
                            <span>{sentence.sentenceIndex + 1}: </span>
                            {sentence.tokens.map(token => {
                                const mention = mentionList.find(m =>
                                    m.sentence_index === sentenceIndex && m.token_indices.includes(token.index_in_sentence)
                                );
                                if (mention && mention.token_indices[0] === token.index_in_sentence) {
                                    const isCurrentMention = mention.id === suggestedMention?.id
                                    return (
                                        <React.Fragment key={token.index_in_document}>
                                            {renderMention(mention, isCurrentMention)}
                                        </React.Fragment>
                                    );
                                } else if (!mention) {
                                    return (
                                        <React.Fragment key={token.index_in_document}>
                                            {renderToken(token)}
                                        </React.Fragment>
                                    );
                                }
                                return null;
                            })}
                        </span>
                    </Card>}
                    <Flex gap='large' align="center" justify="space-between">
                        <Flex align="center" gap='middle'>
                            <Title level={5} style={{ marginTop: '0px', marginBottom: '0px' }}>Mention Suggestions</Title>
                            <Flex vertical gap='small'>
                                <Flex justify="center">
                                    &nbsp;
                                    <div style={{
                                        display: 'inline-flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        marginRight: '1px',
                                        marginBottom: '2px',
                                        verticalAlign: 'middle'
                                    }}>
                                        <BondaryButton
                                            direction="right"
                                            onClick={() => updateMention(sortedMentionList[0], 'left', 'decrease')}
                                        />
                                        <BondaryButton
                                            direction="left"
                                            onClick={() => updateMention(sortedMentionList[0], 'left', 'extend')}
                                        />
                                    </div>
                                    &nbsp; &nbsp;
                                    <Select
                                        value={selectedTag}
                                        onChange={(value) => handleUpdateMentionType(value, sortedMentionList[0].id)}
                                        style={{ width: 190, backgroundColor: mentionColors[selectedTag], color:'black', borderRadius: '8px'}}
                                        options={data}
                                    >
                                        {data.map(option => (
                                            <Select.Option 
                                            key={option.value} 
                                            value={option.value} 
                                            >
                                                {option.label}
                                            </Select.Option>
                                        ))}
                                    </Select>
                                    &nbsp; &nbsp;
                                    <div style={{
                                        display: 'inline-flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        marginRight: '1px',
                                        marginBottom: '2px',
                                        verticalAlign: 'middle'
                                    }}>
                                        <BondaryButton
                                            direction="left"
                                            onClick={() => updateMention(sortedMentionList[0], 'right', 'decrease')}
                                        />
                                        <BondaryButton
                                            direction="right"
                                            onClick={() => updateMention(sortedMentionList[0], 'right', 'extend')}
                                        />
                                    </div>
                                    &nbsp;
                                </Flex>
                                <Flex gap='middle' justify="center">
                                    <Button type="primary" onClick={(e) => {
                                        handleAcceptMention(sortedMentionList[0].id);
                                        e.currentTarget.blur();
                                    }}>Accept</Button>
                                    <Button type="primary" onClick={(e) => {
                                        handleRejectMention(sortedMentionList[0].id)
                                        e.currentTarget.blur();
                                    }}>Reject</Button>
                                </Flex>
                            </Flex>
                        </Flex>
                        <Flex vertical justify="flex-end" gap='small'>
                            <Popconfirm
                                title="Accept all suggestions"
                                description={<span>Are you sure you want to accept all suggestions? <br />
                                    This accepts all remaining suggestions. <br />
                                    You can't go back to this step!</span>}
                                placement="left"
                                onConfirm={handleAcceptAllMentions}
                                okText="Yes"
                                cancelText="No"
                            >
                                <Button>Accept All</Button>
                            </Popconfirm>
                            <Popconfirm
                                title="Reject all suggestions"
                                description={
                                    <span>Are you sure you want to reject all suggestions? <br />
                                        This removes all remaining suggestions. <br />
                                        You can't go back to this step!</span>}
                                placement="left"
                                onConfirm={handleRejectAllMentions}
                                okText="Yes"
                                cancelText="No"
                            >
                                <Button>Reject All</Button>
                            </Popconfirm>
                        </Flex>
                    </Flex>
                </Card>
            </Affix>}
        </>
    );
}

export default MentionSuggestionContainer;