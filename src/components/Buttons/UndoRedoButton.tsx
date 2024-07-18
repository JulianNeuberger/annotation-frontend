import { Button, Flex, Form, Input, Modal } from "antd";
import { useDocumentData } from "../../contexts/DocumentDataContext.tsx";
import logger, { EventActionType, EventLog } from "../../utils/eventLogger.ts";
import { useHotkeys } from "react-hotkeys-hook";
import { RedoOutlined, UndoOutlined } from "@ant-design/icons";
import React from "react";
import { DocumentData } from "../../interfaces/interfaces.ts";
import { NewDocumentData, NewEntity, NewMention, NewRelation, NewToken } from "../../interfaces/newData.ts";


interface DataToSend {
    userId: string;
    taskId: string;
    document: NewDocumentData;
    logs: EventLog[];
    acceptedMentions: [number, number];
    acceptedRelations: [number, number];
}

const backendHost = import.meta.env.VITE_BACKEND_HOST;

const UndoRedoButtons = () => {
    const { documentData, undoAction, redoAction } = useDocumentData();
    const [visible, setVisible] = React.useState<boolean>(false);
    const [form] = Form.useForm();

    useHotkeys('ctrl+z', undoAction);
    useHotkeys('ctrl+y', redoAction);


    const showModal = () => {
        setVisible(true);
        console.log(logger.getLogs())
    };


    const handleCancel = () => {
        setVisible(false);
    };


    const handleSubmit = () => {
        if (!documentData) {
            return;
        }
        form
            .validateFields()
            .then((values) => {
                console.log("Form values:", values);
                const dataToSend = {
                    ...values,
                    acceptedMentions: documentData.acceptedMentions,
                    acceptedRelations: documentData.acceptedRelations,
                    document: transformDocumentDataToNewDocumentData(documentData),
                    logs: logger.getLogs(),

                }
                console.log('Data to send:', dataToSend);
                sendDataToBackend(dataToSend);
                setVisible(false);

            })
            .catch((info) => {
                console.log('Validate Failed:', info);
            });
    }


    const sendDataToBackend = async (dataToSend: DataToSend) => {
        try {
            const response = await fetch(`${backendHost}/results`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dataToSend)
            });
            if (response.ok) {
                console.log('Data sent successfully');
            } else {
                throw new Error('Failed to send data');
            }
        } catch (error) {
            console.error('Error sending data:', error);
        }
    };


    return (
        <>
            <Flex gap='small'>
                <Button size='large' icon={<UndoOutlined />} onClick={undoAction} />
                <Button size='large' icon={<RedoOutlined />} onClick={redoAction} />
                <Button size='large' onClick={() => {
                    showModal();
                    logger.logEvent({
                        timestamp: Date.now(),
                        action: EventActionType.PROCESS_END,
                    });
                }}>Save Document</Button>
            </Flex>
            <Modal
                title='Save Document'
                open={visible}
                onCancel={handleCancel}
                okText="Submit"
                onOk={handleSubmit}
                cancelText="Cancel"
            >
                <Form form={form}>
                    <Form.Item
                        name="userId"
                        label="ID"
                        rules={[{ required: true, message: 'Please input the ID!' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="taskId"
                        label="Task ID"
                        rules={[{ required: true, message: 'Please input the Task ID!' }]}
                    >
                        <Input />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};


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

export default UndoRedoButtons;