import { Entity, MentionItem } from "../../../interfaces/interfaces.ts";

export const getEntityMentionsFromEvidence = (entities: Entity[], mentionList: MentionItem[],entityIndex: number, evidence: number[], isHead: boolean) => {
    const entity = entities[entityIndex];
    if (!entity) {
        console.error(`Entity at index ${entityIndex} not found`);
        return [];
    }

    const sentenceIndex = evidence[isHead ? 0 : (evidence.length > 1 ? 1 : 0)];
    return entity.mention_indices
        .map(index => mentionList[index])
        .filter(mention => mention && mention.sentence_index === sentenceIndex);
};