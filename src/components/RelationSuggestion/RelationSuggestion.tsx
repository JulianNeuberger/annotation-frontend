import { Card, Flex } from "antd";
import { MentionItem, RelationItem, Token } from "../../interfaces/interfaces.ts";
import { useMemo } from "react";
import { useDocumentData } from "../../contexts/DocumentDataContext.tsx";
import { mentionColors } from "../Annotation/mentionConfig.ts";
import React from "react";
import { ArcherContainer, ArcherElement } from "react-archer";
import { relationTypes } from "../RelationEditor/RelationConfig.ts";


type AnchorPosition = 'top' | 'bottom' | 'left' | 'right' | 'middle';
type ValidLineStyles = 'angle' | 'straight' | 'curve';

interface RelationSuggestionProps {
    relation: RelationItem;
    mentionList: MentionItem[];
}

const RelationSuggestion = ({ relation, mentionList }: RelationSuggestionProps) => {
    const { documentData } = useDocumentData();
    const sentences = useMemo(() => documentData?.sentences || [], [documentData?.sentences]);

    const sourceMention = mentionList.find(mention => relation.headID.includes(mention.id));
    const targetMention = mentionList.find(mention => relation.tailID.includes(mention.id));

    const renderRelationMention = (mention: MentionItem, isSource: boolean, key: string) => {
        const mentionTag = mention.tag;
        const mentionTagColor = mentionColors[mentionTag];
        const isLastToken = (token: Token) => mention.token_indices[mention.token_indices.length - 1] === token.index_in_sentence;
        const relationsProps = isSource ? [{
            targetId: `type-${relation.id}`,
            targetAnchor: 'bottom' as AnchorPosition,
            sourceAnchor: 'middle' as AnchorPosition,
            style: {
                strokeColor: 'white',
                strokeWidth: 1.5,
                lineStyle: 'straight' as ValidLineStyles,
                endMarker: true,

            },
        }] : [];

        return (
            <ArcherElement key={key} id={isSource ? `source-${relation.id}` : `target-${relation.id}`} relations={relationsProps}>
                <div style={{ display: 'inline-block' }}>
                    <span style={{
                        backgroundColor: mentionTagColor,
                        border: '2px solid white',
                        borderRadius: '5px',
                        display: 'inline-block',
                        lineHeight: '1.2',
                        paddingLeft: '1px'
                    }}>
                        {mention.tokens.map((token, tokenIndex) => {
                            return (
                                <React.Fragment key={`${mention.id}-${tokenIndex}`}>
                                    <span style={{ color: 'black' }}>
                                        {token.text}
                                        &nbsp;
                                    </span>
                                    {isLastToken(token) && <span className="entity-tag">{mentionTag}</span>}
                                    {isLastToken(token) && <span className="entity-tag">{isSource ? 'Source' : 'Target'}</span>}
                                </React.Fragment>
                            );
                        })}
                    </span>
                    &nbsp;
                </div>
            </ArcherElement>
        )
    }

    const renderToken = (token: Token, key: string) => {
        return (
            <React.Fragment key={key} >
                <span style={{
                    border: '2px solid transparent',
                    borderRadius: '5px',
                }}>
                    {token.text}
                </span>
                &nbsp;
            </React.Fragment>
        );
    };

    const renderType = (type: string, isTwoSentence: boolean) => {

        const displayName = getDisplayNameForTag(type);

        const relationProps = [{
            targetId: `target-${relation.id}`,
            targetAnchor: 'middle' as AnchorPosition,
            sourceAnchor: 'bottom' as AnchorPosition,
            style: {
                strokeColor: 'grey',
                strokeWidth: 2,
                noCurves: false,
                endMarker: true,
                offset: 0,
                endShape: {
                    circle: {
                        radius: 2,
                        fillColor: 'white',
                        strokeColor: 'black',
                    }
                }, lineStyle: 'straight' as ValidLineStyles,
            },
        }];

        return (
            <ArcherElement id={`type-${relation.id}`} relations={relationProps}>
                <div style={{
                    display: 'inline-flex',
                    position: 'absolute',
                    transform: 'translateY(-50%,)',
                    top: isTwoSentence ? '30px' : '-50%',
                    right: '75%',
                    height: isTwoSentence ? '60px' : '60%',
                    borderBottom: '2px solid red',
                    whiteSpace: 'nowrap',
                }}>
                    {displayName}
                </div>
            </ArcherElement>
        );
    }

    const renderMention = (mention: MentionItem, key: string) => {
        const mentionTag = mention.tag;
        const mentionTagColor = mentionColors[mentionTag];
        const isLastToken = (token: Token) => mention.token_indices[mention.token_indices.length - 1] === token.index_in_sentence;

        return (
            <span key={key} style={{
                backgroundColor: mentionTagColor,
                borderRadius: '5px',
                display: 'inline-block',
                lineHeight: '1.2',
                paddingLeft: '2px',
                paddingRight: '2px',
                margin: '1px',
            }}
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
            </span>
        );
    };

    const getMention = (token: Token, sentenceIndex: number) => mentionList.find(m =>
        m.sentence_index === sentenceIndex && m.token_indices.includes(token.index_in_sentence)
    );

    const getDisplayNameForTag = (tag: string) => {
        const typeObj = relationTypes.find(type => type.tag === tag);
        return typeObj ? typeObj.displayName : tag;
    };


    return (
        <Card style={{ paddingTop: '10px', position: 'relative' }}>
            <Flex vertical>
                <ArcherContainer key={relation.id}>
                    {relation.evidence.map(evidenceIndex => {
                        const sentence = sentences[evidenceIndex];
                        const isTwoSentence = relation.evidence.length > 1;
                        return (
                            <div key={`${relation.id}-${evidenceIndex}`}>
                                <React.Fragment key={`${relation.id}-${evidenceIndex}`}>
                                    <span style={{ lineHeight: '7' }}>
                                        {sentence.tokens.map(token => {
                                            console.log(token);
                                            const mention = getMention(token, evidenceIndex);
                                            const isSource = mention === sourceMention;
                                            const keyBase = `${relation.id}-${evidenceIndex}-${token.index_in_document}`;
                                            if (mention && mention.token_indices[0] === token.index_in_sentence) {
                                                if (mention === sourceMention || mention === targetMention) {
                                                    return renderRelationMention(mention, isSource, `mention-${keyBase}`);
                                                }
                                                else {
                                                    return renderMention(mention, `mention-${keyBase}`);
                                                }
                                            } else if (!mention) {
                                                return renderToken(token, `token-${keyBase}`)
                                            }
                                            return null;
                                        })}
                                        {renderType(relation.tag, isTwoSentence)}
                                    </span>
                                    {relation.evidence.length > 1 && evidenceIndex === relation.evidence[0] && <><br /><br /></>}
                                </React.Fragment>
                            </div>

                        );
                    })}
                </ArcherContainer>
            </Flex>
        </Card>
    );
}

export default RelationSuggestion;