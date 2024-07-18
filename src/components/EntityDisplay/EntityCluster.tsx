import { useMemo } from "react";
import { Entity, MentionItem } from "../../interfaces/interfaces.ts";
import { useDocumentData } from "../../contexts/DocumentDataContext.tsx";
import EntityItem from "./EntityItem.tsx";

interface EntityClusterProps {
  entity: Entity;
  selectedMentions: MentionItem[];
  setSelectedMentions: React.Dispatch<React.SetStateAction<MentionItem[]>>;
}

const EntityCluster = ({ entity, selectedMentions, setSelectedMentions }: EntityClusterProps) => {
  const { documentData } = useDocumentData();
  const mentions = useMemo(() => documentData?.mentions || [], [documentData?.mentions]);

  const hasRelevantMentions = useMemo(() => {
    return entity.mention_indices.some(index => {
      const mention = mentions[index];
      return mention && (mention.tag === 'actor' || mention.tag === 'activity data');
    });
  }, [entity, mentions]);

  if (!hasRelevantMentions) {
    return null;
  }

  return (
    <div style={{ border: '1px solid #ccc', margin: '10px 0', borderRadius: '8px' }}>
      <ul style={{ paddingLeft: '10px' }}>
        {entity.mention_indices.map((mentionIndex) => {
          const mention = mentions[mentionIndex];
          return mention ? <EntityItem key={mentionIndex} mentionIndex={mentionIndex} selectedMentions={selectedMentions} setSelectedMentions={setSelectedMentions} /> : null;
        })}
      </ul>
    </div>
  );
};

export default EntityCluster;