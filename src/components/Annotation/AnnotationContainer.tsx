import { Card, Flex, Spin, Typography } from "antd";
import AnnotatedText from "../AnnotatedText/AnnotatedText.tsx";
import RelationDisplay from "../RelationDisplay/RelationDisplay.tsx";
import React, { useMemo } from "react";
import { MentionItem, SelectedToken } from "../../interfaces/interfaces.ts";
import { useDocumentData } from "../../contexts/DocumentDataContext.tsx";
import RelationSuggestionContainer from "../RelationSuggestionContainer/RelationSuggestionContainer.tsx";
import { Workflow } from "../../utils/workflow_enum.ts";
import EntityDisplay from "../EntityDisplay/EntityDisplay.tsx";

const { Title } = Typography;

interface AnnotationContainerProps {
    isLoading: boolean;
    currentStep: number;
    setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
    withVisualizedProgress: boolean;
}

const AnnotationContainer = ({ isLoading, currentStep, setCurrentStep, withVisualizedProgress }: AnnotationContainerProps) => {
    const { documentData } = useDocumentData();
    const mentions = documentData?.mentions || [];
    const relations = documentData?.relations || [];
    const sentences = documentData?.sentences || [];

    const [selectedTokens, setSelectedTokens] = React.useState<SelectedToken[]>([]);
    const [selectedMentions, setSelectedMentions] = React.useState<MentionItem[]>([]);
    const [selectedRelationId, setSelectedRelationId] = React.useState<string | null>(null);

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

    const relationList = useMemo(() => {
        return relations.map(relation => {
            const headMention = mentionList[relation.head];
            const tailMention = mentionList[relation.tail];

            const headID = headMention.id;
            const tailID = tailMention.id;
            return {
                ...relation,
                headID: headID,
                tailID: tailID,
            }
        })
    }, [relations, mentionList]);


    return (
        <>
            <Flex gap='middle' justify='center'>
                {isLoading &&
                    <Flex vertical>
                        <Spin size="large" style={{ marginTop: '25px' }} />
                        <Title level={5}>Loading...</Title>
                    </Flex>
                }
                {currentStep === Workflow.ENTITIES && <EntityDisplay
                    selectedMentions={selectedMentions}  
                    setSelectedMentions={setSelectedMentions}
                />}
                {(currentStep === Workflow.MENTION || currentStep === Workflow.MENTION_SUGGESTION || currentStep === Workflow.ENTITIES || currentStep === Workflow.COMPLETE) &&
                    <>
                        <Card style={{ width: '100%' }}>
                            <AnnotatedText
                                selectedTokens={selectedTokens}
                                setSelectedTokens={setSelectedTokens}
                                selectedMentions={selectedMentions}
                                setSelectedMentions={setSelectedMentions}
                                mentionList={mentionList}
                                relationList={relationList}
                                isLoading={isLoading}
                                currentStep={currentStep}
                                setCurrentStep={setCurrentStep}
                                withVisualizedProgress={withVisualizedProgress}
                            />
                        </Card>
                    </>
                }
                {currentStep === Workflow.COMPLETE && <Card style={{ width: "75%" }}>
                    <RelationDisplay
                        mentionList={mentionList}
                        selectedMentions={selectedMentions}
                        setSelectedMentions={setSelectedMentions}
                        isLoading={isLoading}
                        selectedRelationId={selectedRelationId}
                        setSelectedRelationId={setSelectedRelationId}
                    />
                </Card>}
            </Flex>
            {currentStep === Workflow.COMPLETE && <EntityDisplay
                selectedMentions={selectedMentions}
                setSelectedMentions={setSelectedMentions}
            />}
            {currentStep === Workflow.RELATION_SUGGESTION && <RelationSuggestionContainer
                relationList={relationList}
                mentionList={mentionList}
                setCurrentStep={setCurrentStep}
            />}
        </>
    );
};

export default AnnotationContainer;