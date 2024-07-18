import React, { useState } from 'react';
import { useDocumentData } from '../../contexts/DocumentDataContext.tsx';
import './InputForm.css';
import { Input, Button, notification, Select, Space } from 'antd';
import { v4 as uuidv4 } from 'uuid';
import { DocumentData, Token } from '../../interfaces/interfaces.ts';
import logger, { EventActionType } from '../../utils/eventLogger.ts';
import { Workflow } from '../../utils/workflow_enum.ts';
import { NewDocumentData } from '../../interfaces/newData.ts';

const { TextArea } = Input;

interface InputFormProps {
    isLoading: boolean;
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
    isSubmitted: boolean;
    setIsSubmitted: React.Dispatch<React.SetStateAction<boolean>>;
    setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
    setWithVisualizedProgress: React.Dispatch<React.SetStateAction<boolean>>;
    withVisualizedProgress: boolean;

}

const InputForm = ({ isLoading, setIsLoading, isSubmitted, setIsSubmitted, setCurrentStep, setWithVisualizedProgress, withVisualizedProgress }: InputFormProps) => {
    const { setDocumentData } = useDocumentData();
    const [inputText, setInputText] = useState<string>("");
    const [selectedModel, setSelectedModel] = useState<string>("GoodAI");

    const backendHost = import.meta.env.VITE_BACKEND_HOST;

    // const fetchDocumentData = async () => {
    //     try {
    //         const response = await fetch(`http://localhost:5001/get-document`, {
    //             method: 'GET',
    //             headers: {
    //                 'Content-Type': 'application/json',
    //                 'Accept': 'application/json',
    //             },
    //         });
    //         if (!response.ok) {
    //             throw new Error(`HTTP error! Status: ${response.status}`);
    //         }
    //         const data = await response.json();
    //         console.log('Document Data:', data);
    //         const documentData = transformNewDocumentDataToDocumentData(data);
    //         console.log('Transformed Document Data:', documentData);
    //         setDocumentData(documentData);

    //         setIsSubmitted(true);
    //         logEvent<undefined>({
    //             timestamp: Date.now(),
    //             action: EventActionType.PROCESS_START,
    //         })
    //         notification.success({
    //             message: 'Data Submitted',
    //             description: 'Your data has been successfully submitted and is processed.',
    //             placement: 'topRight',
    //         });

    //     }
    //     catch (error) {
    //         console.error('Could not fetch document data:', error);
    //     } finally {
    //         setIsLoading(false);
    //         setCurrentStep(Workflow.MENTION_SUGGESTION);
    //     }
    // }

    const handleDataRetrieval = async (inputText: string) => {
        setIsLoading(true);
        try {
            const requestBody = {
                text: inputText,
                option: selectedModel,
            }


            const response = await fetch(`${backendHost}/annotate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            console.log('Document Data:', data);
            const documentData = transformNewDocumentDataToDocumentData(data);

            setDocumentData(documentData);
            setIsSubmitted(true);
            logger.logEvent({
                timestamp: Date.now(),
                action: EventActionType.PROCESS_START,
            })
            notification.success({
                message: 'Data Submitted',
                description: 'Your data has been successfully submitted and is processed.',
                placement: 'topRight',
            });
        } catch (error) {
            console.error("Could not fetch data: ", error);
        } finally {
            setIsLoading(false);
            setCurrentStep(Workflow.MENTION_SUGGESTION);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInputText(e.target.value);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleDataRetrieval(inputText);
    };


    function transformNewDocumentDataToDocumentData(newDoc: NewDocumentData): DocumentData {
        const document: DocumentData = {
            id: newDoc.id,
            name: newDoc.name,
            text: newDoc.text,
            category: newDoc.category,
            sentences: [],
            relations: [],
            mentions: [],
            entities: [],
            acceptedMentions: [0, 0],
            acceptedRelations: [0, 0]
        };

        const sentencesMap: Map<number, Token[]> = new Map();
        newDoc.tokens.forEach(newToken => {
            let tokens = sentencesMap.get(newToken.sentenceIndex);
            if (!tokens) {
                tokens = [];
                sentencesMap.set(newToken.sentenceIndex, tokens);
            }
            tokens.push({
                text: newToken.text,
                index_in_document: newToken.indexInDocument,
                index_in_sentence: tokens.length,
                pos_tag: newToken.posTag,
                sentence_index: newToken.sentenceIndex
            });
        });

        document.sentences = Array.from(sentencesMap.entries()).sort((a, b) => a[0] - b[0]).map(([index, tokens]) => ({
            sentenceIndex: index,
            tokens: tokens
        }));

        document.acceptedMentions[0] = newDoc.mentions.length;
        document.acceptedRelations[0] = newDoc.relations.length;

        newDoc.mentions.forEach(newMention => {
            if (newMention.tokenDocumentIndices.length > 0) {
                const firstTokenIndex = newMention.tokenDocumentIndices[0];
                const firstToken = newDoc.tokens.find(t => t.indexInDocument === firstTokenIndex);
                if (firstToken) {
                    const sentenceTokens = sentencesMap.get(firstToken.sentenceIndex);
                    if (sentenceTokens) {
                        const tokenIndices = newMention.tokenDocumentIndices.map(docIndex =>
                            sentenceTokens.findIndex(t => t.index_in_document === docIndex)).filter(index => index !== -1);

                        document.mentions.push({
                            id: uuidv4(),
                            tag: (newMention.type).toLowerCase(),
                            sentence_index: firstToken.sentenceIndex,
                            token_indices: tokenIndices,
                            tokenInDocumentIndices: newMention.tokenDocumentIndices,
                            suggestion: true
                        });
                    }
                }
            }
        });

        newDoc.relations.forEach(newRelation => {
            const headMention = document.mentions[newRelation.headMentionIndex];
            const tailMention = document.mentions[newRelation.tailMentionIndex];
            console.log(newRelation, headMention, tailMention)
            if (headMention && tailMention) {
                const evidence = headMention.sentence_index === tailMention.sentence_index ?
                    [headMention.sentence_index] :
                    [headMention.sentence_index, tailMention.sentence_index];

                let tag = newRelation.type;
                let isCondition = false;

                if (tag === "flow" && headMention.tag === "xor gateway" && tailMention.tag === "condition specification") {
                    tag = "condition specification";
                    isCondition = true;
                }

                document.relations.push({
                    id: uuidv4(),
                    head: newRelation.headMentionIndex,
                    tail: newRelation.tailMentionIndex,
                    tag: tag,
                    evidence: evidence.sort((a, b) => a - b),
                    suggestion: true,
                    marked: false,
                    isCondition: isCondition,
                });
            }
        });

        newDoc.entities.forEach(newEntity => {
            document.entities.push({
                mention_indices: newEntity.mentionIndices
            });
        });

        return document;
    }



    return (
        <>
            {!isLoading && !isSubmitted && (
                <div style={{ width: "100%", marginBottom: '24px' }}>
                    <TextArea
                        rows={6}
                        value={inputText}
                        onChange={handleInputChange}
                        placeholder="Enter text to annotate here..."
                    />
                    <Space wrap style={{ marginTop: '16px' }}>
                        <Select
                            defaultValue={selectedModel}
                            onChange={(value) => setSelectedModel(value)}
                            // style={{ width: 120 }}
                            options={[
                                { value: "NoAI", label: "Unsupported" },
                                { value: "GoodAI", label: "Supported" },
                            ]}
                        />
                        <Select
                            defaultValue={withVisualizedProgress}
                            onChange={(value) => setWithVisualizedProgress(value)}
                            // style={{ width: 120 }}
                            options={[
                                { value: false, label: "Non-visualized" },
                                { value: true, label: "Visualized" },
                            ]}
                        />
                        <Button type="primary" onClick={handleSubmit}>
                            Submit
                        </Button>
                    </Space>
                </div>
            )}
        </>
    );
};

export default InputForm;