import { useCallback, useEffect, useState } from "react";
import { useDocumentData } from "../../contexts/DocumentDataContext.tsx";
import { DocumentData } from "../../interfaces/interfaces.ts";
import { NewDocumentData, NewEntity, NewMention, NewRelation, NewToken } from "../../interfaces/newData.ts";
import { Button, Result, Spin } from "antd";

const VisiualizedProgressContainer = () => {
    const { documentData } = useDocumentData();
    const [visualData, setVisualData] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showImage, setShowImage] = useState(false);

    const visualizerHost = import.meta.env.VITE_VISUALIZER_HOST;

    const toggleImage = () => {
        setShowImage(prevShowImage => !prevShowImage);
    };


    const handleDataRetrieval = useCallback(async () => {
        if (!documentData) {
            console.error('Document data is not available');
            return;
        }

        setIsLoading(true);
        const requestBody = transformDocumentDataToNewDocumentData(documentData);

        try {

            const response = await fetch(`${visualizerHost}/convert/json`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const retrievedVisualDataString = await response.text();
            setVisualData(retrievedVisualDataString);
        }
        catch (error: unknown) {
            if (error instanceof Error) {
                setError(`Failed to retrieve visual data: ${error.message}`);
            } else {
                setError('Failed to retrieve visual data due to an unknown error.');
            }
        }
        finally {
            setIsLoading(false);
        }
    }, [documentData]);


    useEffect(() => {
        handleDataRetrieval();
    }, [handleDataRetrieval]);


    function transformDocumentDataToNewDocumentData(document: DocumentData): NewDocumentData {

        const newTokens: NewToken[] = document.sentences.flatMap(sentence =>
            sentence.tokens.map(token => ({
                indexInDocument: token.index_in_document,
                posTag: token.pos_tag,
                text: token.text,
                sentenceIndex: token.sentence_index
            }))
        );

        const newMentions: NewMention[] = document.mentions.map(mention => ({
            tokenDocumentIndices: mention.tokenInDocumentIndices,
            type: mention.tag
        }));

        const newRelations: NewRelation[] = document.relations.map(relation => ({
            headMentionIndex: relation.head,
            tailMentionIndex: relation.tail,
            type: relation.isCondition ? 'flow' : relation.tag
        }));

        const newEntities: NewEntity[] = document.entities.map(entity => ({
            mentionIndices: entity.mention_indices
        }));

        return {
            id: document.id,
            name: document.name,
            text: document.text,
            category: document.category,
            tokens: newTokens,
            mentions: newMentions,
            relations: newRelations,
            entities: newEntities
        };
    }

    const containerStyles = {
        width: '100%',
        height: '500px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        backgroundColor: '#141414',
        border: '1px solid #d9d9d9',
        borderRadius: '8px',
        marginTop: '10px'
    };


    return (
        <div style={containerStyles}>
            {isLoading ?
                <Spin size="large" style={{ marginTop: '25px' }} /> :
                visualData ?
                    (showImage ?
                        (<img onClick={toggleImage} src={visualData} alt='Progress' style={{ maxWidth: '100%', maxHeight: '100%' }} />) :
                        (<Button onClick={toggleImage}>Show BPMN-Model</Button>)) :
                    (<Result status='warning' title={"A BPMN-Model can't be generated with the current data"} />)
            }
        </div>
    )
}

export default VisiualizedProgressContainer;