import { useDocumentData } from "../../contexts/DocumentDataContext.tsx";
import './RelationDisplay.css';
import { nerTagColors } from "../Annotation/mentionConfig.ts";
import { MentionItem } from "../../interfaces/interfaces.ts";
import { Button, Card, Checkbox, Flex, Select, Skeleton, Switch, Typography, notification } from "antd";
import { ArrowRightOutlined, DeleteOutlined } from "@ant-design/icons";
import { relationTypes } from "../RelationEditor/RelationConfig.ts";
import logger, { EventActionType } from "../../utils/eventLogger.ts";
import { useState } from "react";

const { Title } = Typography;

interface RelationDisplayProps {
    mentionList: MentionItem[];
    selectedMentions: MentionItem[];
    setSelectedMentions: React.Dispatch<React.SetStateAction<MentionItem[]>>;
    isLoading: boolean;
    selectedRelationId: string | null;
    setSelectedRelationId: React.Dispatch<React.SetStateAction<string | null>>;
}

const RelationDisplay = ({ mentionList, selectedMentions, setSelectedMentions, isLoading }: RelationDisplayProps) => {
    const { documentData, performAction } = useDocumentData();
    const relations = documentData?.relations || [];

    const [showAllRelations, setShowAllRelations] = useState<boolean>(true);
    const [showMarkedRelations, setShowMarkedRelations] = useState<boolean>(false);


    const onSwitchChange = (checked: boolean) => {
        setShowAllRelations(checked);
    };

    const onMarkedRelationsSwitchChange = (checked: boolean) => {
        setShowMarkedRelations(checked);
    };

    const getSelectedMentionIndex = () => {
        if (selectedMentions.length === 0) return null;

        const selectedMention = selectedMentions[0];

        const mentionIndex = mentionList.findIndex(mention => mention.id === selectedMention.id);

        return mentionIndex !== -1 ? mentionIndex : null;
    };


    const getFilteredRelations = () => {
        let filteredRelations = relations;

        if (selectedMentions.length > 0) {
            const selectedMentionIndex = getSelectedMentionIndex();
            filteredRelations = filteredRelations.filter(relation =>
                relation.head === selectedMentionIndex || relation.tail === selectedMentionIndex
            );
        }

        if (showMarkedRelations) {
            filteredRelations = filteredRelations.filter(relation => relation.marked);
        }

        return filteredRelations;
    };


    const isMentionSelected = (mention: MentionItem) => {
        return selectedMentions.some(selectedMention =>
            selectedMention.id === mention.id
        );
    };


    const handleRemoveRelation = (relationId: string) => {
        if (!documentData) return;

        const clonedData = structuredClone(documentData);

        const relationToRemove = clonedData.relations.find(relation => relation.id === relationId);

        clonedData.relations = clonedData.relations.filter(relation => relation.id !== relationId);

        performAction(clonedData);

        logger.logEvent({
            timestamp: Date.now(),
            action: EventActionType.RELATION_DELETED,
            data: relationToRemove,
        });

        notification.success({
            message: 'Relation Deleted',
            description: 'Relation has been successfully deleted.',
        });
    };


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


    const handleRelationTypeChange = (newType: string, relationId: string) => {
        if (!documentData) return;

        const clonedData = structuredClone(documentData);

        clonedData.relations = clonedData.relations.map(relation => {
            if (relation.id === relationId) {
                return { ...relation, tag: newType, isCondition: newType === 'condition specification' ? true : false};
            }
            return relation;
        });

        performAction(clonedData);

        logger.logEvent({
            timestamp: Date.now(),
            action: EventActionType.RELATION_TYPE_UPDATED,
            data: relations.find(relation => relation.id === relationId)
        });

        notification.success({
            message: 'Relation Updated',
            description: 'Relation type has been successfully updated.',
            placement: 'topRight',
        });
    };


    const handleRelationMarkedChange = (marked: boolean, relationId: string,) => {
        if (!documentData) return;

        const clonedData = structuredClone(documentData);

        clonedData.relations = clonedData.relations.map(relation => {
            if (relation.id === relationId) {
                return { ...relation, marked };
            }
            return relation;
        });

        performAction(clonedData);

        logger.logEvent({
            timestamp: Date.now(),
            action: marked ? EventActionType.RELATION_MARKED : EventActionType.RELATION_UNMARKED,
            data: relations.find(relation => relation.id === relationId)
        });

        notification.success({
            message: 'Relation Updated',
            description: 'Relation marked status has been successfully updated.',
            placement: 'topRight',
        });
    }


    const renderHeadMention = (headMention: MentionItem) => {
        const isSelected = isMentionSelected(headMention)
        const selectedClass = isSelected ? 'selected-mention' : '';
        const backgroundColor = nerTagColors[headMention.tag];
        return (
            <span
                className={`head-mention ${selectedClass}`}
                style={{ background: backgroundColor, color: 'black', cursor: 'pointer' }}
                onClick={() => handleMentionClick(headMention)}>
                {headMention.tokens.map(token => token.text).join(" ")}
                <span className="ner-tag">{headMention.tag}</span>
            </span>
        );
    }

    const renderTailMention = (tailMention: MentionItem) => {
        const isSelected = isMentionSelected(tailMention)
        const selectedClass = isSelected ? 'selected-mention' : '';
        const backgroundColor = nerTagColors[tailMention.tag];
        return (
            <span
                className={`tail-mention ${selectedClass}`}
                style={{ background: backgroundColor, color: 'black', cursor: 'pointer' }}
                onClick={() => handleMentionClick(tailMention)}>
                {tailMention.tokens.map(token => token.text).join(" ")}
                <span className="ner-tag">{tailMention.tag}</span>
            </span>
        );
    }


    return (
        <>
            <Flex justify="space-between">
                <Title level={4} style={{ marginTop: '0px', marginBottom: '0px' }}>Relations</Title>
                <Flex gap='middle'>
                    <Switch checkedChildren='Marked Relations' unCheckedChildren='Show Marked Relations' checked={showMarkedRelations} onChange={onMarkedRelationsSwitchChange} />
                    <Switch checkedChildren='All Relations' unCheckedChildren='Selected Relations' defaultChecked onChange={onSwitchChange} />
                </Flex>
            </Flex>
            {isLoading ? (
                <Skeleton active paragraph={{ rows: 17 }} />
            ) : relations.length > 0 ? (
                <div className="component-container">
                    {(showAllRelations || selectedMentions.length > 0) ?
                        (<div className="relations-list">
                            {getFilteredRelations().length > 0 ? (
                                getFilteredRelations().map((relation) => {
                                    const headMention = mentionList[relation.head];
                                    const tailMention = mentionList[relation.tail];
                                    const opacityStyle = relation.suggestion ? {
                                        filter: "saturate(25%)",
                                        boxShadow: '0 0 8px rgba(255, 255, 255, 0.3)',
                                        paddingBotton: '0px',
                                        border: '1px solid #d9d9d9', borderRadius: '5px', paddingLeft: '5px', paddingRight: '5px'
                                    }
                                        : { border: '1px solid #d9d9d9', borderRadius: '5px', paddingLeft: '5px', paddingRight: '5px' };
                                    return (
                                        <div key={relation.id} style={opacityStyle}>
                                            <Flex justify="space-between" align="center">
                                                <div style={{ width: '100%', paddingTop: '15px' }}>
                                                    {renderHeadMention(headMention)}
                                                    <ArrowRightOutlined />
                                                    <Select
                                                        value={relation.tag}
                                                        style={{ width: 190 }}
                                                        onChange={(value: string) => {
                                                            handleRelationTypeChange(value, relation.id)

                                                        }}
                                                        options={relationTypes.map(type => ({ value: type.tag, label: type.displayName }))}
                                                    />
                                                    <ArrowRightOutlined />
                                                    {renderTailMention(tailMention)}
                                                </div>
                                                <Flex gap='middle'>
                                                    <Checkbox onChange={e => handleRelationMarkedChange(e.target.checked, relation.id)} checked={relation.marked} />
                                                    <Button type='default' size='small' icon={<DeleteOutlined />} onClick={() => handleRemoveRelation(relation.id)} danger></Button>
                                                </Flex>
                                            </Flex>

                                        </div>
                                    );
                                })) : (
                                <Card style={{ marginTop: '10px' }}>
                                    {"This mention has no relations or no relations are marked."}
                                </Card>
                            )}
                        </div>) : <Card style={{ marginTop: '10px' }}>
                            {"Select a mention to view relations"}
                        </Card>}
                </div>
            ) : null}
        </>
    );
};

export default RelationDisplay;