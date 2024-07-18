export interface Token {
    text: string;
    index_in_document: number;
    index_in_sentence: number;
    pos_tag: string;
    sentence_index: number;
}
export interface Sentence {
    sentenceIndex: number;
    tokens: Token[];
}
  
export interface Mention {
    id: string;
    tag: string;
    sentence_index: number;
    token_indices: number[];
    tokenInDocumentIndices: number[];
    suggestion: boolean;
}

export interface Relation {
    id: string;
    head: number;
    tail: number;
    tag: string;
    evidence: number[];
    suggestion: boolean;
    marked: boolean;
    isCondition: boolean;
}

export interface Entity {
    mention_indices: number[];
}

export interface DocumentData {
    category: string;
    id: string;
    text: string;
    name: string;
    sentences: Sentence[];
    mentions: Mention[];
    entities: Entity[];
    relations: Relation[];
    acceptedMentions: [number, number];
    acceptedRelations: [number, number];
}

export interface SelectedToken {
    token: Token;
    tokenIndexInSentence: number;
}

export interface MentionItem {
    tokens: Token[];
    token_indices: number[];
    sentence_index: number;
    tag: string;
    id: string;
    suggestion: boolean;
}

export interface RelationItem {
    headID: string;
    tailID: string;
    id: string;
    head: number;
    tail: number;
    tag: string;
    evidence: number[];
    suggestion: boolean;
    marked: boolean;
}