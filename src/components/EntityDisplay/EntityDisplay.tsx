import { useMemo } from "react";
import { useDocumentData } from "../../contexts/DocumentDataContext.tsx";
import { Card, Typography } from "antd";
import React from "react";
import EntityCluster from "./EntityCluster.tsx";
import { v4 as uuidv4 } from 'uuid';
import { MentionItem } from "../../interfaces/interfaces.ts";

const { Title } = Typography;

interface EntityDisplayProps {
    selectedMentions: MentionItem[];
    setSelectedMentions: React.Dispatch<React.SetStateAction<MentionItem[]>>;
}

const EntityDisplay = ({selectedMentions, setSelectedMentions }: EntityDisplayProps) => {
    const { documentData } = useDocumentData();
    const entitiesList = useMemo(() => {
        return documentData?.entities.map(entity => ({
                ...entity,
                id: uuidv4(),
        })) || [];
    }, [documentData?.entities]);

    return (
        <Card style={{ width: '30%' }}>
            <Title level={4} style={{ marginTop: '0px', marginBottom: '0px' }}>Entities</Title>
            {entitiesList.map((entity) => {
                return (
                    <React.Fragment key={entity.id}>
                        <EntityCluster entity={entity} selectedMentions={selectedMentions} setSelectedMentions={setSelectedMentions}/>
                    </React.Fragment>
                );
            })}
        </Card>
    );
}

export default EntityDisplay;