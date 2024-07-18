import { Button, Card, Flex, Popconfirm, Select, Space, Switch, Typography, notification } from "antd";
import { useDocumentData } from "../../contexts/DocumentDataContext.tsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MentionItem, Relation, RelationItem } from "../../interfaces/interfaces.ts";
import logger, { EventActionType } from "../../utils/eventLogger.ts";
import RelationSuggestion from "../RelationSuggestion/RelationSuggestion.tsx";
import { relationTypes } from "../RelationEditor/RelationConfig.ts";
import { Workflow } from "../../utils/workflow_enum.ts";
import { useHotkeys } from "react-hotkeys-hook";

const { Title } = Typography;

interface RelationSuggestionContainerProps {
    relationList: RelationItem[];
    mentionList: MentionItem[];
    setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
}

const data = [
    { value: relationTypes[0].tag, label: relationTypes[0].displayName },
    { value: relationTypes[1].tag, label: relationTypes[1].displayName },
    { value: relationTypes[2].tag, label: relationTypes[2].displayName },
    { value: relationTypes[3].tag, label: relationTypes[3].displayName },
    { value: relationTypes[4].tag, label: relationTypes[4].displayName },
    { value: relationTypes[5].tag, label: relationTypes[5].displayName },
    { value: relationTypes[6].tag, label: relationTypes[6].displayName },
];

const RelationSuggestionContainer = ({ relationList, mentionList, setCurrentStep }: RelationSuggestionContainerProps) => {
    const { documentData, setDocumentData, clearUndoRedoStacks, performAction } = useDocumentData();
    const relations = useMemo(() => documentData?.relations || [], [documentData?.relations]);
    const [hasSuggestions, setHasSuggestions] = useState<boolean>(true);
    const [selectedTag, setSelectedTag] = useState<string>('');
    const [showAllRelations, setShowAllRelations] = useState<boolean>(false);
    const [hasMovedToNextStep, setHasMovedToNextStep] = useState(false);
    const [initialSuggestionsSet, setInitialSuggestionsSet] = useState(false);


    useHotkeys('enter', () => {
        if (hasSuggestions) {
            acceptRelationSuggestion(sortedRelationList[0].id);
        }
    });

    useHotkeys('backspace', () => {
        if (hasSuggestions) {
            rejectRelationSuggestion(sortedRelationList[0].id);
        }
    });


    useEffect(() => {
        if (!initialSuggestionsSet) {
            setDocumentData(prevData => {
                if(!prevData) return null;
                const updatedRelationSuggestions = prevData.relations.filter(relation => relation.suggestion).length;
                return { ...prevData, acceptedRelations: [updatedRelationSuggestions, prevData.acceptedRelations[1]]};
            });
            
            setInitialSuggestionsSet(true); 
        }
    }, [initialSuggestionsSet, setDocumentData]);


    useEffect(() => {
        const updateHasSuggestions = () => {
            const remainingSuggestions = relations.filter(relation => relation.suggestion).length;
            setHasSuggestions(remainingSuggestions > 0);
        };

        updateHasSuggestions();
    }, [relations]);


    // const onSwitchChange = (checked: boolean) => {
    //     setShowAllRelations(checked);
    // }


    const sortedRelationList = useMemo(() => {
        const suggestedRelations = relationList.filter(relation => relation.suggestion);
        return suggestedRelations.sort((a, b) => {
            return a.evidence[0] - b.evidence[0];
        });
    }, [relationList]);


    useEffect(() => {
        if (sortedRelationList.length > 0) {
            setSelectedTag(sortedRelationList[0]?.tag);
        }
    }, [sortedRelationList]);


    useEffect(() => {
        if (sortedRelationList.length === 0 && !hasMovedToNextStep) {
            setCurrentStep(Workflow.COMPLETE);
            setHasMovedToNextStep(true);
            clearUndoRedoStacks();
        }
    }, [sortedRelationList, setCurrentStep, hasMovedToNextStep, clearUndoRedoStacks]);


    const acceptRelationSuggestion = (relationId: string) => {
        if (!documentData) return;

        const clonedData = structuredClone(documentData);

        clonedData.relations = clonedData.relations.map(relation => {
            if (relation.id === relationId) {
                return { ...relation, suggestion: false };
            }
            return relation;
        });

        clonedData.acceptedRelations[1] += 1;

        performAction(clonedData);

        logger.logEvent({
            timestamp: Date.now(),
            action: EventActionType.RELATION_SUGGESTION_ACCEPTED,
            data: relations.find(relation => relation.id === relationId)
        });

        notification.success({
            message: 'Relation Suggestion Accepted',
            description: 'The relation suggestion has been accepted.',
        });
    };


    const rejectRelationSuggestion = (relationId: string) => {
        if (!documentData) return;

        const clonedData = structuredClone(documentData);

        clonedData.relations = clonedData.relations.filter(relation => relation.id !== relationId);

        performAction(clonedData);

        logger.logEvent({
            timestamp: Date.now(),
            action: EventActionType.RELATION_SUGGESTION_REJECTED,
            data: relations.find(relation => relation.id === relationId)
        });

        notification.success({
            message: 'Relation Suggestion Rejected',
            description: 'The relation suggestion has been rejected.',
        });
    };


    const acceptAllRelationSuggestions = useCallback(() => {
        setDocumentData(prevData => {
            if (!prevData) return null;
            const updatedRelations = prevData.relations.map(relation => {
                if (relation.suggestion) {
                    logger.logEvent({
                        timestamp: Date.now(),
                        action: EventActionType.RELATION_SUGGESTION_ACCEPTED,
                        data: relation
                    });
                    return { ...relation, suggestion: false };
                }
                return relation;
            });

            return { ...prevData, relations: updatedRelations };
        });

        notification.success({
            message: 'All Relation Suggestions Accepted',
            description: 'All remaining relation suggestions have been accepted.',
        });

        logger.logEvent({
            timestamp: Date.now(),
            action: EventActionType.RELATION_SUGGESTION_ACCEPTED_ALL,
        })
    }, [setDocumentData]);

    const rejectAllRelationSuggestions = useCallback(() => {
        setDocumentData(prevData => {
            if (!prevData) return null;

            const updatedRelations: Relation[] = [];
            prevData.relations.forEach(relation => {
                if (relation.suggestion) {
                    logger.logEvent({
                        timestamp: Date.now(),
                        action: EventActionType.RELATION_SUGGESTION_REJECTED,
                        data: relation
                    });
                } else {
                    updatedRelations.push(relation);
                }
            });

            return { ...prevData, relations: updatedRelations };
        });

        notification.success({
            message: 'All Relation Suggestions Rejected',
            description: 'All remaining relation suggestions have been rejected.',
        });

        logger.logEvent({
            timestamp: Date.now(),
            action: EventActionType.RELATION_SUGGESTION_REJECTED_ALL,
        })
    }, [setDocumentData]);


    const handleRelationTypeChange = (newType: string, relationId: string) => {
        if (!documentData) return;

        const clonedData = structuredClone(documentData);

        clonedData.relations = clonedData.relations.map(relation => {
            if (relation.id === relationId) {
                return { ...relation, tag: newType };
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
            message: 'Relation Type Updated',
            description: 'The relation type has been updated.',
        });
    };

    const handleRelationMarked = (relationId: string) => {
        if (!documentData) return;

        const clonedData = structuredClone(documentData);

        clonedData.relations = clonedData.relations.map(relation => {
            if (relation.id === relationId) {
                return { ...relation, marked: true, suggestion: false};
            }
            return relation;
        });

        performAction(clonedData);

        logger.logEvent({
            timestamp: Date.now(),
            action: EventActionType.RELATION_SUGGESTION_MARKED,
            data: clonedData.relations.find(relation => relation.id === relationId)
        });

        notification.success({
            message: 'Relation Marked',
            description: 'The relation has been marked.',
        });
    }



    return (
        <Card>
            <Flex justify="space-between">
                <Flex gap='large'>
                    <Title level={4} style={{ marginTop: '0px' }}>Relation Suggestion</Title>
                    {relations.length > 0 && <Flex gap='small'>
                        <Flex gap='small'>
                            <Button type="primary" onClick={(e) => {
                                acceptRelationSuggestion(sortedRelationList[0].id)
                                e.currentTarget.blur();
                            }}>Accept</Button>
                            <Button type="primary" onClick={(e) => {
                                rejectRelationSuggestion(sortedRelationList[0].id)
                                e.currentTarget.blur();
                            }}>Reject</Button>

                            <Select onChange={(value) => handleRelationTypeChange(value, sortedRelationList[0].id)} value={selectedTag} style={{ width: 190 }} options={data} />
                            <Button onClick={(e) => {
                                handleRelationMarked(sortedRelationList[0].id)
                                e.currentTarget.blur();
                            }} type="primary">Mark and Postpone</Button>
                        </Flex>
                    </Flex>}
                </Flex>
                <Flex gap='small' justify="flex-end">
                    <Popconfirm
                        title="Accept all suggestions"
                        description={<span>Are you sure you want to accept all suggestions? <br />
                            This accepts all remaining suggestions. <br />
                            You can't go back to this step!</span>}
                        placement="topLeft"
                        onConfirm={acceptAllRelationSuggestions}
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
                        placement="topLeft"
                        onConfirm={rejectAllRelationSuggestions}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button>Reject All</Button>
                    </Popconfirm>
                    {/* <Flex align="center">
                        <Switch checkedChildren="Show All" unCheckedChildren="Show Single" onChange={onSwitchChange} />
                    </Flex> */}
                </Flex>
            </Flex>
            {(hasSuggestions && sortedRelationList.length > 0) ? (<RelationSuggestion
                relation={sortedRelationList[0]}
                mentionList={mentionList}
            />) : (<p>No more relation suggestions</p>)}
            {showAllRelations && sortedRelationList.length > 1 &&
                <>
                    <Title level={4}>Other Suggestions</Title>
                    <Space direction="vertical">
                        {sortedRelationList.slice(1).map(relation => (
                            <RelationSuggestion
                                key={relation.id}
                                relation={relation}
                                mentionList={mentionList}
                            />
                        ))}
                    </Space>
                </>}
        </Card>
    )
}

export default RelationSuggestionContainer;