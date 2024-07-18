import { Button, Flex, notification } from 'antd';
import { useDocumentData } from '../../contexts/DocumentDataContext.tsx';
import { MentionItem, SelectedToken} from '../../interfaces/interfaces.ts';
import './RelationEditor.css';
import { relationTypes } from './RelationConfig.ts';
import { SelectedMentionState } from '../../types/types.ts';
import { v4 as uuidv4 } from 'uuid';
import React from 'react';


interface RelationEditorProps {
    mentionList: MentionItem[];
    selectedMentions: SelectedMentionState;
    setSelectedMentions: React.Dispatch<React.SetStateAction<SelectedMentionState>>;
    selectedRelationId: string | null;
    setSelectedRelationId: React.Dispatch<React.SetStateAction<string | null>>;
}

const RelationEditor = ({ mentionList, selectedMentions, setSelectedMentions, selectedRelationId, setSelectedRelationId }: RelationEditorProps) => {
    const { documentData, setDocumentData } = useDocumentData();
    const entities = documentData?.entities || [];


    const findEntityIndexByMentionIndex = (mentionIndex: number) => {
        return entities.findIndex(entity => entity.mention_indices.includes(mentionIndex));
    };

    const findMentionIndexInList = (selectedMention: SelectedToken[]) => {
        return mentionList.findIndex(mention =>
            mention.sentence_index === selectedMention[0].token.sentence_index &&
            mention.token_indices.every(index => selectedMention.some(st => st.tokenIndexInSentence === index))
        );
    };

    const addRelation = (relationType: string) => {
        if(selectedRelationId) {
            updateRelationType(selectedRelationId, relationType);
        } else {
            if (selectedMentions.length !== 2) {
                notification.warning({
                    message: 'Selection Error',
                    description: 'Please select exactly two mentions to form a relation.',
                });
                return;
            }

            const headMentionIndex = findMentionIndexInList(selectedMentions[0]);
            const tailMentionIndex = findMentionIndexInList(selectedMentions[1]);

            if (headMentionIndex == null || tailMentionIndex == null || !relationType) {
                notification.warning({
                    message: 'Selection Error',
                    description: 'Please select both entities and a relation type',
                });
                return;
            }

            let headEntityIndex = findEntityIndexByMentionIndex(headMentionIndex);
            let tailEntityIndex = findEntityIndexByMentionIndex(tailMentionIndex);

            setDocumentData(prevData => {
                if (!prevData) return null;

                const newEntities = [...prevData.entities];

                if (headEntityIndex === -1) {
                    const newHeadEntity = { mention_indices: [headMentionIndex] };
                    newEntities.push(newHeadEntity);
                    headEntityIndex = newEntities.length - 1; 
                }

                if (tailEntityIndex === -1) {
                    const newTailEntity = { mention_indices: [tailMentionIndex] };
                    newEntities.push(newTailEntity);
                    tailEntityIndex = newEntities.length - 1;
                }

                const headSentenceIndex = mentionList[headMentionIndex].sentence_index;
                const tailSentenceIndex = mentionList[tailMentionIndex].sentence_index;
                const evidence = [headSentenceIndex];
                if (headSentenceIndex !== tailSentenceIndex) {
                    evidence.push(tailSentenceIndex);
                }

                const newRelation = {
                    head: headEntityIndex,
                    tail: tailEntityIndex,
                    tag: relationType,
                    evidence: evidence,
                    id: uuidv4(),
                    suggestion: false,
                    marked: false,
                    isCondition: false,
                };
                return {
                    ...prevData,
                    entities: newEntities,
                    relations: [...prevData.relations, newRelation]
                };
            });
            setSelectedMentions([]);
        }
    };


    const updateRelationType = (relationId: string, newType: string) => {
        setDocumentData(prevData => {
            if (!prevData) return null;
            
            const updatedRelations = prevData.relations.map(relation => {
                if (relation.id === relationId) {
                    return { ...relation, tag: newType };
                }
                return relation;
            });
    
            return { ...prevData, relations: updatedRelations };
        });
    
        setSelectedRelationId(null);
    };


    return (
        <Flex gap='small' justify='center' wrap='wrap'>
            {relationTypes.map((type, index) => (
                <Button
                    key={index}
                    type="primary"
                    style={{ fontSize: '1.1em', fontWeight: 500 }}
                    onClick={() => addRelation(type.tag)}
                >
                {type.displayName}
                </Button>
            ))}
        </Flex>
    );
};

export default RelationEditor;