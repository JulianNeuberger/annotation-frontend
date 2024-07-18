export interface NewDocumentData {
    id: string;
    name: string;
    text: string;
    category: string;
    tokens: NewToken[];
    mentions: NewMention[];
    relations: NewRelation[];
    entities: NewEntity[];
}

export interface NewToken {
    indexInDocument: number;
    posTag: string;
    text: string;
    sentenceIndex: number;
}

export interface NewMention {
    tokenDocumentIndices: number[];
    type: string;
}

export interface NewRelation {
    headMentionIndex: number;
    tailMentionIndex: number;
    type: string;
}

export interface NewEntity {
    mentionIndices: number[];
}