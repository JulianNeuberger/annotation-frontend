import { Button, Divider, Flex, Typography, notification } from "antd"
import { mentionColors } from "../Annotation/mentionConfig.ts";
import { DeleteOutlined } from "@ant-design/icons";
import { Entity, Mention, MentionItem, SelectedToken } from "../../interfaces/interfaces.ts";
import { useDocumentData } from "../../contexts/DocumentDataContext.tsx";

import logger, { EventActionType } from "../../utils/eventLogger.ts";
import { v4 as uuidv4 } from 'uuid';
import { relationTypes } from "../RelationEditor/RelationConfig.ts";
import { useHotkeys } from "react-hotkeys-hook";
import { Workflow } from "../../utils/workflow_enum.ts";

const { Title } = Typography;

interface ControlPanelProps {
  selectedTokens: SelectedToken[];
  selectedMentions: MentionItem[];
  setSelectedMentions: React.Dispatch<React.SetStateAction<MentionItem[]>>;
  setSelectedTokens: React.Dispatch<React.SetStateAction<SelectedToken[]>>;
  mentionList: MentionItem[];
  currentStep: number;
}


const ControlPanel = ({ selectedTokens, setSelectedTokens, selectedMentions, setSelectedMentions, mentionList, currentStep }: ControlPanelProps) => {
  const { documentData, performAction } = useDocumentData();
  const relations = documentData?.relations || [];
  const mentions = documentData?.mentions || [];

  useHotkeys('1', () => {
    if (selectedTokens.length > 0) {
      handleCreateMention('actor');
    }
    if (selectedMentions.length === 1) {
      handleUpdateMentionType('actor');
    }
    if (selectedMentions.length === 2) {
      addRelation('flow');
    }
  });

  useHotkeys('2', () => {
    if (selectedTokens.length > 0) {
      handleCreateMention('activity');
    }
    if (selectedMentions.length === 1) {
      handleUpdateMentionType('activity');
    }
    if (selectedMentions.length === 2) {
      addRelation('uses');
    }
  });

  useHotkeys('3', () => {
    if (selectedTokens.length > 0) {
      handleCreateMention('activity data');
    }
    if (selectedMentions.length === 1) {
      handleUpdateMentionType('activity data');
    }
    if (selectedMentions.length === 2) {
      addRelation('actor performer');
    }
  });

  useHotkeys('4', () => {
    if (selectedTokens.length > 0) {
      handleCreateMention('xor gateway');
    }
    if (selectedMentions.length === 1) {
      handleUpdateMentionType('xor gateway');
    }
    if (selectedMentions.length === 2) {
      addRelation('actor recipient');
    }
  });

  useHotkeys('5', () => {
    if (selectedTokens.length > 0) {
      handleCreateMention('and gateway');
    }
    if (selectedMentions.length === 1) {
      handleUpdateMentionType('and gateway');
    }
    if (selectedMentions.length === 2) {
      addRelation('same gateway');
    }
  });

  useHotkeys('6', () => {
    if (selectedTokens.length > 0) {
      handleCreateMention('further specification');
    }
    if (selectedMentions.length === 1) {
      handleUpdateMentionType('further specification');
    }
    if (selectedMentions.length === 2) {
      addRelation('further specification');
    }
  });

  useHotkeys('7', () => {
    if (selectedTokens.length > 0) {
      handleCreateMention('condition specification');
    }
    if (selectedMentions.length === 1) {
      handleUpdateMentionType('condition specification');
    }
  });

  useHotkeys('backspace', () => {
    if (selectedMentions.length === 1) {
      handleRemoveMention();
    }
  });


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


  const handleUpdateMentionType = (newType: string) => {
    if (!documentData) return;
    if (selectedMentions.length !== 1) return;

    const selectedMention = selectedMentions[0];

    if (selectedMention.tag === newType) {
      notification.warning({
        message: 'Update Error',
        description: 'The selected mention is already of the same type.',
      });
      return;
    }

    const mentionIndex = mentions.findIndex(mention => mention.id === selectedMention.id);
    const isActorOrActivity = selectedMention.tag === 'actor' || selectedMention.tag === 'activity data';
    const entityCluster = documentData.entities.find(entity =>
      entity.mention_indices.includes(mentionIndex) &&
      entity.mention_indices.some(index =>
        documentData.mentions[index].tag === selectedMention.tag && index !== mentionIndex));


    const clonedData = structuredClone(documentData);

    if (mentionIndex !== -1) {
      clonedData.mentions[mentionIndex] = {
        ...clonedData.mentions[mentionIndex],
        tag: newType,
      }
      performAction(clonedData);

      logger.logEvent({
        timestamp: Date.now(),
        action: EventActionType.MENTION_TYPE_UPDATED,
        data: clonedData.mentions[mentionIndex],
      });

      setSelectedMentions([]);
      notification.success({
        message: 'Mention Updated',
        description: 'The mention type has been successfully updated.',
      });

      if (isActorOrActivity && entityCluster) {
        console.log('Check Entity Cluster');
        notification.info({
          message: 'Check Entity Cluster',
          description: 'This mention was part of a cluster with similar types. Please review the cluster for consistency.',
          placement: 'top',
          duration: 8,
        });
      }
    } else {
      notification.error({
        message: 'Update Error',
        description: 'The selected mention could not be updated.',
      });
    }
  }


  const handleRemoveMention = () => {
    if (!documentData) return;
    if (selectedMentions.length !== 1) {
      notification.warning({
        message: 'Selection Error',
        description: 'Removal is only allowed with exactly one mention selected.',
      });
      return;
    }

    const selectedMention = selectedMentions[0];
    const mentionIndexToRemove = mentions.findIndex(mention => mention.id === selectedMention.id);

    const clonedData = structuredClone(documentData);

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
    clonedData.mentions = clonedData.mentions.filter(mention => mention.id !== selectedMention.id);
    clonedData.entities = clonedData.entities.filter(cluster => cluster.mention_indices.length > 0);

    performAction(clonedData);

    logger.logEvent({
      timestamp: Date.now(),
      action: EventActionType.MENTION_DELETED,
      data: mentionToRemove,
    });

    notification.success({
      message: 'Mention Deleted',
      description: 'The mention has been successfully deleted.',
    });

    setSelectedMentions([]);
    setSelectedTokens([]);
  };


  const addRelation = (relationType: string) => {
    if (!documentData) return;
    if (selectedMentions.length !== 2) {
      notification.warning({
        message: 'Selection Error',
        description: 'Please select exactly two mentions to form a relation.',
      });
      return;
    }

    const headMentionIndex = mentionList.findIndex(mention => mention.id === selectedMentions[0].id);
    const tailMentionIndex = mentionList.findIndex(mention => mention.id === selectedMentions[1].id);

    const existingRelation = relations.find(relation =>
      (relation.head === headMentionIndex && relation.tail === tailMentionIndex) ||
      (relation.head === tailMentionIndex && relation.tail === headMentionIndex)
    );

    if (existingRelation) {
      notification.warning({
        message: 'Duplicate Relation',
        description: 'A relation between these two mentions already exists.',
      });
      return;
    }

    const clonedData = structuredClone(documentData);

    const headSentenceIndex = mentionList[headMentionIndex].sentence_index;
    const tailSentenceIndex = mentionList[tailMentionIndex].sentence_index;
    const evidence = [headSentenceIndex];
    if (headSentenceIndex !== tailSentenceIndex) {
      evidence.push(tailSentenceIndex);
    }

    const newRelation = {
      head: headMentionIndex,
      tail: tailMentionIndex,
      tag: relationType,
      evidence: evidence,
      id: uuidv4(),
      suggestion: false,
      marked: false,
      isCondition: relationType === 'condition specification',
    };

    clonedData.relations.push(newRelation);

    performAction(clonedData);

    logger.logEvent({
      timestamp: Date.now(),
      action: EventActionType.RELATION_CREATED,
      data: newRelation,
    });

    notification.success({
      message: 'Relation Created',
      description: 'The relation has been successfully created.',
    });

    setSelectedMentions([]);
  };

  const handleGroupMentions = () => {
    if (!documentData) return;
    if (selectedMentions.length < 2) {
      notification.warning({
        message: 'Grouping Error',
        description: 'Select at least two mentions to form a group.',
      });
      return;
    }

    const allowedTypes = ['actor', 'activity data'];

    const firstMentionType = selectedMentions[0].tag;
    const allMentionsHaveTheSameType = selectedMentions.every(mention => mention.tag === firstMentionType);

    const isAllowedType = allowedTypes.includes(firstMentionType);

    if (!allMentionsHaveTheSameType || !isAllowedType) {
      notification.warning({
        message: 'Grouping Error',
        description: 'All selected mentions must be of the same type and must be either "actor" or "activity data".',
      });
      return;
    }

    const clonedData = structuredClone(documentData);

    const mentionIndices = selectedMentions.map(mention => mentionList.findIndex(m => m.id === mention.id));

    const targetMentionIndex = mentionList.findIndex(m => m.id === selectedMentions[0].id);


    let targetClusterIndex = clonedData.entities.findIndex(cluster =>
      cluster.mention_indices.some(index => targetMentionIndex === index)
    );

    if (targetClusterIndex === -1) {
      clonedData.entities.push({ mention_indices: [] });
      targetClusterIndex = clonedData.entities.length - 1;
    }

    const targetCluster = clonedData.entities[targetClusterIndex];

    mentionIndices.forEach(index => {
      if (!targetCluster.mention_indices.includes(index)) {
        targetCluster.mention_indices.push(index);
      }
    });

    clonedData.entities.forEach((cluster, index) => {
      if (index !== targetClusterIndex) {
        cluster.mention_indices = cluster.mention_indices.filter(index => !mentionIndices.includes(index));
      }
    });

    clonedData.entities = clonedData.entities.filter(cluster => cluster.mention_indices.length > 0);

    performAction(clonedData);

    notification.success({
      message: 'Mentions Grouped',
      description: 'The selected mentions have been successfully grouped.',
    });

    logger.logEvent({
      timestamp: Date.now(),
      action: EventActionType.ENTITY_GROUPED,
      data: targetCluster,
    });
    setSelectedMentions([]);
  }

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
      {(selectedTokens.length > 0 || selectedMentions.length > 0) && (
        <div>
          {selectedTokens.length > 0 && (
            <div>
              <Flex justify="center">
                <Title level={4} style={{ marginTop: '0px' }}>Select Mention Type</Title>
              </Flex>
              <Flex gap='small' wrap="wrap" justify="space-evenly">
                {Object.entries(mentionColors).map(([mentionType, color]) => (
                  <Button
                    key={mentionType}
                    style={{ backgroundColor: color, color: 'black', }}
                    onClick={() => handleCreateMention(mentionType)}
                  >
                    {mentionType}
                  </Button>
                ))}
              </Flex>
            </div>
          )}
          {selectedMentions.length === 1 && (
            <div>
              <Flex justify="center">
                <Title level={4} style={{ marginTop: '0px' }}>Update Mention Type or Delete Mention</Title>
              </Flex>
              <Flex vertical align="center" gap='small'>
                <Flex gap='small' wrap="wrap" justify="space-evenly">
                  {Object.entries(mentionColors).map(([mentionType, color]) => (
                    <Button
                      key={mentionType}
                      style={{ backgroundColor: color, color: 'black', }}
                      onClick={() => handleUpdateMentionType(mentionType)}
                    >
                      {mentionType}
                    </Button>
                  ))}
                </Flex>
                <Button type='default' icon={<DeleteOutlined />} onClick={handleRemoveMention} danger>Remove</Button>
              </Flex>
            </div>
          )}
          {(currentStep !== Workflow.MENTION_SUGGESTION && currentStep !== Workflow.MENTION) ? (
            <div>
              {selectedMentions.length === 2 ? (
                <>
                  {currentStep !== Workflow.ENTITIES && (
                    <>
                      <Flex justify="center">
                        <Title level={4} style={{ marginTop: '0px' }}>Select Relation Type</Title>
                      </Flex>
                      <Flex gap='small' wrap="wrap" justify="space-evenly">
                        {relationTypes.map((type, index) => (
                          <Button
                            key={index}
                            type="primary"
                            style={{ color: 'white' }}
                            onClick={() => addRelation(type.tag)}
                          >
                            {type.displayName}
                          </Button>
                        ))}
                      </Flex>
                      <Divider style={{ marginTop: '10px', marginBottom: '10px' }} />
                    </>)}
                  <Flex justify="center">
                    <Title level={4} style={{ marginTop: '0px' }}>Group Mentions</Title>
                  </Flex>
                  <Flex justify="center">
                    <Button
                      type="primary"
                      onClick={handleGroupMentions}
                    >
                      Group Selected Mentions
                    </Button>
                  </Flex>
                </>
              ) : selectedMentions.length > 2 ? (
                <div>
                  <Flex justify="center">
                    <Title level={4} style={{ marginTop: '0px' }}>Group Mentions</Title>
                  </Flex>
                  <Flex justify="center">
                    <Button
                      type="primary"
                      onClick={handleGroupMentions}
                    >
                      Group Selected Mentions
                    </Button>
                  </Flex>
                </div>
              ) : null}
            </div>
          ) : selectedMentions.length >= 2 ? (
            <Flex justify="center">
              <Title level={4} style={{ marginTop: '0px' }}>Relation or Entity Creation is not available in this step.</Title>
            </Flex>
          ) : null}
        </div>
      )}
    </div>
  )
}

export default ControlPanel;