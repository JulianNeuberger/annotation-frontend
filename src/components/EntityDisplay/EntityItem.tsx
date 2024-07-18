import { useMemo } from "react";
import { useDocumentData } from "../../contexts/DocumentDataContext.tsx";
import { mentionColors } from "../Annotation/mentionConfig.ts";
import { MentionItem, Token } from "../../interfaces/interfaces.ts";
import React from "react";
import { CloseOutlined } from "@ant-design/icons";
import { notification } from "antd";
import logger, { EventActionType } from "../../utils/eventLogger.ts";


interface EntityItemProps {
    mentionIndex: number;
    selectedMentions: MentionItem[];
    setSelectedMentions: React.Dispatch<React.SetStateAction<MentionItem[]>>;
}

const EntityItem = ({ mentionIndex, selectedMentions, setSelectedMentions}: EntityItemProps) => {
    const { documentData, performAction } = useDocumentData();
    const mentions = useMemo(() => documentData?.mentions || [], [documentData?.mentions]);
    const sentences = useMemo(() => documentData?.sentences || [], [documentData?.sentences]);

    const mentionList = useMemo(() => {
        return mentions.map(mention => {
            const sentence = sentences[mention.sentence_index];
            const mentionTokens = mention.token_indices.map(index => sentence.tokens[index]);
            return {
                ...mention,
                tokens: mentionTokens
            };
        });
    }, [mentions, sentences]);


    const handleMentionClick = (mention: MentionItem) => {
        setSelectedMentions(prevSelectedMentions => {
            const isAlreadySelected = prevSelectedMentions.some(selectedMention =>
                selectedMention.id === mention.id
            );

            if (isAlreadySelected) {
                return prevSelectedMentions.filter(selectedMention => selectedMention.id !== mention.id);
            } else {
                return [...prevSelectedMentions, mention];
            }
        });
        logger.logEvent({
            timestamp: Date.now(),
            action: EventActionType.MENTION_SELECTED,
            data: mention,
        });
    };

    const isMentionSelected = (mention: MentionItem) => {
        return selectedMentions.some(selectedMention =>
            selectedMention.id === mention.id
        );
    };


    const removeMentionFromCluster = (mentionIndex: number) => {
        if (!documentData) return;
        const clonedData = structuredClone(documentData);

        let found = false;
        for (let i = 0; i < clonedData?.entities.length; i++) {
            const index = clonedData.entities[i].mention_indices.indexOf(mentionIndex);
            if (index !== -1) {
                if(clonedData.entities[i].mention_indices.length === 1) {
                    notification.warning({
                        message: 'Cluster Error',
                        description: 'Cannot remove the last mention from a cluster',
                    });
                    return;
                }

                clonedData.entities[i].mention_indices.splice(index, 1);
                found = true;
                break;
            }
        }
        if(found) {
            clonedData.entities.push({ mention_indices: [mentionIndex] });
        }

        performAction(clonedData);

        logger.logEvent({
            timestamp: Date.now(),
            action: EventActionType.ENTITY_MENTION_REMOVED,
            data: mentionIndex,
        }); 

        notification.success({
            message: 'Mention removed from cluster',
            description: 'The mention has been removed from the cluster',
        });
    }

    const renderMention = (index: number) => {
        const isSelected = isMentionSelected(mentionList[index]);
        const mention = mentionList[index];
        const mentionTag = mention.tag;
        const mentionTagColor = mentionColors[mentionTag];
        const isLastToken = (token: Token) => mention.token_indices[mention.token_indices.length - 1] === token.index_in_sentence;

        return (
            <>
                <span style={{
                    backgroundColor: mentionTagColor,
                    borderRadius: '5px',
                    display: 'inline-block',
                    lineHeight: '1.2',
                    paddingLeft: '1px',
                    paddingRight: '2px',
                    margin: '1px',
                    border: isSelected ? '2px solid white' : '2px solid transparent',
                    cursor: 'pointer',
                }}
                onClick={() => handleMentionClick(mention)}
                >
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
                    {/* <Button icon={<CloseOutlined />}/> */}
                    <CloseOutlined onClick={(e) => {
                        removeMentionFromCluster(mentionIndex);
                        e.stopPropagation();
                        }}/>
                </span>
                &nbsp;
            </>
        )
    }

    return (
        <li style={{ listStyle: 'none'}}>{renderMention(mentionIndex)}</li>
    );
}

export default EntityItem;