import { SelectedToken } from "../interfaces/interfaces.ts";

export type NerTag = 'Actor' | 'Activity' | 'Activity Data' | 'XOR Gateway' | 'AND Gateway' | 'Further Specification' | 'Condition Specification';

export type SelectedMentionState = SelectedToken[][];